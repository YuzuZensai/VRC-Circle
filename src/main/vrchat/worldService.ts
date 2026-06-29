import type { VRChat } from "vrchat";
import type {
  DiscoverCategory,
  FavoriteGroupEdit,
  FavoriteLimits,
  FavoriteVisibility,
  FavoriteWorldFolder,
  MoveResult,
  World,
} from "../../shared/types/world";
import { httpStatusOf } from "./errors";
import {
  getCategoryWorlds,
  getFavoriteGroupWorlds,
  getWorldCategories,
  type WorldFavoriteGroupType,
} from "./rawEndpoints";
import { toWorld } from "./mappers";
import { cachedRead } from "./cachedRead";
import { requireActiveClient } from "./client";
import { userCache, currentUser } from "./userService";
import { worldStore } from "../store/worldStore";
import { worldFavoritesStore, type FavoriteGroupInput } from "../store/worldFavoritesStore";
import { broadcast } from "../windows";
import { cacheKeys, policies } from "../cache/policies";

export async function getWorld(worldId: string): Promise<World> {
  try {
    const world = await cachedRead(cacheKeys.world(worldId), policies.world, async (vrc) => {
      const { data } = await vrc.getWorld({ path: { worldId }, throwOnError: true });
      return toWorld(data);
    });
    worldStore.addWorld(world);
    return world;
  } catch (err) {
    const fallback = worldStore.get(worldId);
    if (fallback) return fallback;
    throw err;
  }
}

type CachedFavorites = { worlds: World[]; folders: FavoriteWorldFolder[] };

export async function getFavoriteWorlds(userId: string): Promise<FavoriteWorldFolder[]> {
  const { worlds, folders } = await cachedRead<CachedFavorites>(
    cacheKeys.favoriteWorlds(userId),
    policies.favoriteWorlds,
    (vrc) => loadFavoriteWorlds(vrc, userId),
  );
  for (const w of worlds) worldStore.addWorld(w);
  broadcast("world:favoriteFolders", { userId, folders, done: true });
  return folders;
}

async function loadFavoriteWorlds(vrc: VRChat, userId: string): Promise<CachedFavorites> {
  let groups;
  try {
    const { data } = await vrc.getFavoriteGroups({
      query: { ownerId: userId, n: 100 },
      throwOnError: true,
    });
    groups = data.filter((g): g is (typeof data)[number] & { type: WorldFavoriteGroupType } =>
      isWorldGroupType(g.type),
    );
  } catch (err) {
    if (isPrivateFavorites(err)) return { worlds: [], folders: [] };
    throw err;
  }

  const worlds: World[] = [];
  const seen = new Set<string>();
  const members: { id: string; group: string }[] = [];
  const names = new Map<string, string>();
  for (const group of groups) {
    if (group.displayName) names.set(group.name, group.displayName);
    let raw;
    try {
      raw = await getFavoriteGroupWorlds(vrc, group.type, group.name, userId);
    } catch (err) {
      if (isPrivateFavorites(err)) continue;
      throw err;
    }
    for (const rawWorld of raw) {
      members.push({ id: rawWorld.id, group: group.name });
      if (!seen.has(rawWorld.id)) {
        seen.add(rawWorld.id);
        const world = toWorld(rawWorld);
        worlds.push(world);
        worldStore.addWorld(world);
      }
    }
    broadcast("world:favoriteFolders", {
      userId,
      folders: groupIntoFolders(members, names),
      done: false,
    });
  }

  const folders = groupIntoFolders(members, names);
  broadcast("world:favoriteFolders", { userId, folders, done: true });
  return { worlds, folders };
}

function isWorldGroupType(type: string): type is WorldFavoriteGroupType {
  return type === "world" || type === "vrcPlusWorld";
}

function isPrivateFavorites(err: unknown): boolean {
  const status = httpStatusOf(err);
  return status === 401 || status === 403;
}

function groupIntoFolders(
  members: { id: string; group: string }[],
  names: Map<string, string>,
): FavoriteWorldFolder[] {
  const order: string[] = [];
  const byGroup = new Map<string, string[]>();
  for (const { id, group } of members) {
    const ids = byGroup.get(group);
    if (ids) ids.push(id);
    else {
      byGroup.set(group, [id]);
      order.push(group);
    }
  }
  return order.map((name) => ({
    name,
    displayName: names.get(name) ?? prettyFolderName(name),
    worldIds: byGroup.get(name)!,
  }));
}

function prettyFolderName(key: string): string {
  const m = /^worlds(\d+)$/.exec(key);
  if (m) return `Group ${m[1]}`;
  return key.charAt(0).toUpperCase() + key.slice(1);
}

export async function searchWorlds(query: string): Promise<World[]> {
  const worlds = await cachedRead(
    cacheKeys.worldSearch(query),
    policies.worldSearch,
    async (vrc) => {
      const { data } = await vrc.searchWorlds({
        query: { search: query, n: 25, sort: "relevance" as const },
        throwOnError: true,
      });
      return data.map(toWorld);
    },
  );
  for (const w of worlds) worldStore.addWorld(w);
  return worlds;
}

const DISCOVER_ROW_SIZE = 12;

export async function getDiscover(): Promise<DiscoverCategory[]> {
  const categories = await cachedRead(cacheKeys.discover(), policies.discover, async (vrc) => {
    const cats = await getWorldCategories(vrc);
    const rows = await Promise.all(cats.map((cat) => loadCategory(vrc, cat).catch(() => null)));
    return rows.filter((r): r is DiscoverCategory => r !== null && r.worlds.length > 0);
  });
  for (const cat of categories) for (const w of cat.worlds) worldStore.addWorld(w);
  return categories;
}

async function loadCategory(
  vrc: VRChat,
  cat: Awaited<ReturnType<typeof getWorldCategories>>[number],
): Promise<DiscoverCategory> {
  const raw = await getCategoryWorlds(vrc, cat, DISCOVER_ROW_SIZE);
  return { id: cat.id, name: cat.name, worlds: raw.map(toWorld) };
}

const DEFAULT_FOLDER = "worlds1";

export async function loadMyFavoriteWorlds(): Promise<void> {
  const me = await currentUser();
  const { groups, limits } = await cachedRead(
    cacheKeys.myFavoriteWorlds(),
    policies.favoriteWorlds,
    (vrc) => fetchMyFavorites(vrc, me.id),
  );
  worldFavoritesStore.setFavorites(groups, limits);
  void resolveHiddenFavorites(groups);
}

// the favorites listing returns private worlds as "???"; the detail read fills them in, or 404s if deleted
async function resolveHiddenFavorites(groups: FavoriteGroupInput[]): Promise<void> {
  const vrc = requireActiveClient();
  const seen = new Set<string>();
  for (const group of groups) {
    for (const world of group.worlds) {
      if (world.name || seen.has(world.id)) continue;
      seen.add(world.id);
      try {
        const { data } = await vrc.getWorld({ path: { worldId: world.id }, throwOnError: true });
        worldStore.addWorld(toWorld(data));
      } catch (err) {
        if (httpStatusOf(err) === 404) worldStore.addWorld({ ...world, deleted: true });
      }
    }
  }
}

async function fetchMyFavorites(
  vrc: VRChat,
  userId: string,
): Promise<{ groups: FavoriteGroupInput[]; limits: FavoriteLimits }> {
  const [{ data: rawGroups }, limits] = await Promise.all([
    vrc.getFavoriteGroups({ query: { ownerId: userId, n: 100 }, throwOnError: true }),
    fetchFavoriteLimits(vrc),
  ]);
  const worldGroups = rawGroups.filter((g) => isWorldGroupType(g.type));

  const groups: FavoriteGroupInput[] = [];
  for (const group of worldGroups) {
    let worlds: World[] = [];
    try {
      const raw = await getFavoriteGroupWorlds(
        vrc,
        group.type as WorldFavoriteGroupType,
        group.name,
        userId,
      );
      worlds = raw.map(toWorld);
    } catch (err) {
      if (!isPrivateFavorites(err)) throw err;
    }
    groups.push({
      name: group.name,
      displayName: group.displayName || prettyFolderName(group.name),
      visibility: normalizeVisibility(group.visibility),
      worlds,
    });
  }
  return { groups, limits };
}

async function fetchFavoriteLimits(vrc: VRChat): Promise<FavoriteLimits> {
  const { data } = await vrc.getFavoriteLimits({ throwOnError: true });
  return {
    maxGroups: data.maxFavoriteGroups?.world ?? data.defaultMaxFavoriteGroups,
    maxPerGroup: data.maxFavoritesPerGroup?.world ?? data.defaultMaxFavoritesPerGroup,
  };
}

function normalizeVisibility(v: string): FavoriteVisibility {
  return v === "friends" || v === "public" ? v : "private";
}

export async function favoriteWorld(worldId: string, folder = DEFAULT_FOLDER): Promise<void> {
  const vrc = requireActiveClient();
  await vrc.addFavorite({
    body: { type: "world", favoriteId: worldId, tags: [folder] },
    throwOnError: true,
  });
  await reloadMyFavorites();
}

export async function unfavoriteWorld(worldId: string): Promise<void> {
  const vrc = requireActiveClient();
  const fav = await findFavoriteRecord(vrc, worldId);
  if (fav) await vrc.removeFavorite({ path: { favoriteId: fav.id }, throwOnError: true });
  await reloadMyFavorites();
}

export async function moveWorldToFolder(worldId: string, folder: string): Promise<MoveResult> {
  const vrc = requireActiveClient();
  const fav = await findFavoriteRecord(vrc, worldId);
  if (fav?.tags?.includes(folder)) return { moved: 0, skipped: [] };
  if (!(await canRefavorite(vrc, worldId))) return { moved: 0, skipped: [worldId] };
  if (fav) await vrc.removeFavorite({ path: { favoriteId: fav.id }, throwOnError: true });
  await vrc.addFavorite({
    body: { type: "world", favoriteId: worldId, tags: [folder] },
    throwOnError: true,
  });
  await reloadMyFavorites();
  return { moved: 1, skipped: [] };
}

export async function unfavoriteWorlds(worldIds: string[]): Promise<void> {
  const vrc = requireActiveClient();
  const records = await favoriteRecords(vrc);
  for (const id of worldIds) {
    const recordId = records.get(id);
    if (recordId) await vrc.removeFavorite({ path: { favoriteId: recordId }, throwOnError: true });
  }
  await reloadMyFavorites();
}

export async function moveWorldsToFolder(
  worldIds: string[],
  folder: string,
): Promise<MoveResult> {
  const vrc = requireActiveClient();
  const records = await favoriteRecords(vrc);
  const skipped: string[] = [];
  let moved = 0;
  for (const id of worldIds) {
    if (!(await canRefavorite(vrc, id))) {
      skipped.push(id);
      continue;
    }
    const recordId = records.get(id);
    if (recordId) await vrc.removeFavorite({ path: { favoriteId: recordId }, throwOnError: true });
    await vrc.addFavorite({
      body: { type: "world", favoriteId: id, tags: [folder] },
      throwOnError: true,
    });
    moved++;
  }
  await reloadMyFavorites();
  return { moved, skipped };
}

export async function clearFavoriteWorldFolder(folder: string): Promise<void> {
  const vrc = requireActiveClient();
  const me = await currentUser();
  await vrc.clearFavoriteGroup({
    path: { favoriteGroupType: "world", favoriteGroupName: folder, userId: me.id },
    throwOnError: true,
  });
  await reloadMyFavorites();
}

export async function updateFavoriteWorldFolder(
  folder: string,
  edit: FavoriteGroupEdit,
): Promise<void> {
  const vrc = requireActiveClient();
  const me = await currentUser();
  await vrc.updateFavoriteGroup({
    path: { favoriteGroupType: "world", favoriteGroupName: folder, userId: me.id },
    body: {
      displayName: edit.displayName,
      visibility: edit.visibility as never,
    },
    throwOnError: true,
  });
  await reloadMyFavorites();
}

async function canRefavorite(vrc: VRChat, worldId: string): Promise<boolean> {
  try {
    await vrc.getWorld({ path: { worldId }, throwOnError: true });
    return true;
  } catch {
    return false;
  }
}

async function findFavoriteRecord(vrc: VRChat, worldId: string) {
  return (await favoriteRecordEntries(vrc)).find((f) => f.favoriteId === worldId);
}

async function favoriteRecords(vrc: VRChat): Promise<Map<string, string>> {
  return new Map((await favoriteRecordEntries(vrc)).map((f) => [f.favoriteId, f.id]));
}

async function favoriteRecordEntries(vrc: VRChat) {
  const pageSize = 100;
  const entries = [];
  for (let offset = 0; ; offset += pageSize) {
    const { data } = await vrc.getFavorites({
      query: { type: "world", n: pageSize, offset },
      throwOnError: true,
    });
    entries.push(...data);
    if (data.length < pageSize) return entries;
  }
}

async function reloadMyFavorites(): Promise<void> {
  userCache.invalidate(cacheKeys.myFavoriteWorlds());
  const me = await currentUser();
  userCache.invalidate(cacheKeys.favoriteWorlds(me.id));
  await loadMyFavoriteWorlds();
}

export async function getUserWorlds(userId: string, isSelf: boolean): Promise<World[]> {
  const worlds = await cachedRead(
    cacheKeys.userWorlds(userId),
    policies.userWorlds,
    async (vrc) => {
      const query = isSelf
        ? { user: "me" as const, releaseStatus: "all" as const, n: 50, sort: "updated" as const }
        : { userId, releaseStatus: "public" as const, n: 50, sort: "updated" as const };
      const { data } = await vrc.searchWorlds({ query, throwOnError: true });
      return data.map(toWorld);
    },
  );
  worldStore.setAuthorWorlds(userId, worlds);
  return worlds;
}
