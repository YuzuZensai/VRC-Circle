import type { VRChat } from "vrchat";
import type { FavoriteWorldFolder, World } from "../../shared/types/world";
import { httpStatusOf } from "./errors";
import { getFavoriteGroupWorlds, type WorldFavoriteGroupType } from "./rawEndpoints";
import { toWorld } from "./mappers";
import { cachedRead } from "./cachedRead";
import { worldStore } from "../store/worldStore";
import { broadcast } from "../windows";
import { cacheKeys, policies } from "../cache/policies";

export async function getWorld(worldId: string): Promise<World> {
  const world = await cachedRead(cacheKeys.world(worldId), policies.world, async (vrc) => {
    const { data } = await vrc.getWorld({ path: { worldId }, throwOnError: true });
    return toWorld(data);
  });
  worldStore.addWorld(world);
  return world;
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
