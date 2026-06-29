import type { VRChat } from "vrchat";
import type {
  Avatar,
  AvatarEdit,
  AvatarSnapshot,
  FavoriteGroupEdit,
  FavoriteLimits,
  FavoriteVisibility,
} from "../../shared/types/avatar";
import { toAvatar } from "./mappers";
import { httpStatusOf } from "./errors";
import { cachedRead } from "./cachedRead";
import { requireActiveClient } from "./client";
import { userCache, currentUser } from "./userService";
import { entityStore } from "../store/entityStore";
import { avatarStore } from "../store/avatarStore";
import { cacheKeys, policies } from "../cache/policies";
import { getAvatarRaw, getMyAvatarsRaw, getFavoritedAvatarsRaw } from "./rawEndpoints";

type FavoriteFolder = {
  name: string;
  displayName: string;
  visibility: FavoriteVisibility;
  avatars: Avatar[];
};

export async function getAvatar(avatarId: string): Promise<Avatar> {
  try {
    const avatar = await cachedRead(cacheKeys.avatar(avatarId), policies.avatar, async (vrc) => {
      return toAvatar(await getAvatarRaw(vrc, avatarId));
    });
    avatarStore.addAvatar(avatar);
    return avatar;
  } catch (err) {
    const fallback = avatarStore.get(avatarId);
    if (fallback) return fallback;
    throw err;
  }
}

export function avatarSnapshot(): AvatarSnapshot {
  return avatarStore.snapshot();
}

export async function loadMyAvatars(): Promise<void> {
  const avatars = await cachedRead(cacheKeys.avatarMine(), policies.avatarMine, async (vrc) => {
    const data = await getMyAvatarsRaw(vrc);
    return data.map(toAvatar);
  });
  avatarStore.setMine(avatars);
}

export async function loadFavoritedAvatars(): Promise<void> {
  const { folders, limits } = await cachedRead(
    cacheKeys.avatarFavorites(),
    policies.avatarFavorites,
    fetchFavorites,
  );
  avatarStore.setFavorites(folders, limits);
}

async function fetchFavorites(vrc: VRChat): Promise<{
  folders: FavoriteFolder[];
  limits: FavoriteLimits;
}> {
  const [{ data: groups }, limits] = await Promise.all([
    vrc.getFavoriteGroups({ query: { n: 100 }, throwOnError: true }),
    fetchFavoriteLimits(vrc),
  ]);
  const avatarGroups = groups.filter((g) => g.type === "avatar");

  const folders: FavoriteFolder[] = [];
  for (const group of avatarGroups) {
    let raw: Awaited<ReturnType<typeof getFavoritedAvatarsRaw>> = [];
    try {
      raw = await getFavoritedAvatarsRaw(vrc, group.name);
    } catch (err) {
      if (httpStatusOf(err) !== 401 && httpStatusOf(err) !== 403) throw err;
    }
    folders.push({
      name: group.name,
      displayName: group.displayName || prettyFolderName(group.name),
      visibility: normalizeVisibility(group.visibility),
      avatars: raw.map(toAvatar),
    });
  }
  return { folders, limits };
}

async function fetchFavoriteLimits(vrc: VRChat): Promise<FavoriteLimits> {
  const { data } = await vrc.getFavoriteLimits({ throwOnError: true });
  return {
    maxGroups: data.maxFavoriteGroups?.avatar ?? data.defaultMaxFavoriteGroups,
    maxPerGroup: data.maxFavoritesPerGroup?.avatar ?? data.defaultMaxFavoritesPerGroup,
  };
}

function normalizeVisibility(v: string): FavoriteVisibility {
  return v === "friends" || v === "public" ? v : "private";
}

function prettyFolderName(key: string): string {
  const m = /^avatars(\d+)$/.exec(key);
  if (m) return `Group ${m[1]}`;
  return key.charAt(0).toUpperCase() + key.slice(1);
}

export async function selectAvatar(avatarId: string): Promise<void> {
  const vrc = requireActiveClient();
  const { data } = await vrc.selectAvatar({ path: { avatarId }, throwOnError: true });
  userCache.invalidate(cacheKeys.currentUser());
  entityStore.upsertFrom(
    {
      id: data.id,
      currentAvatarId: data.currentAvatar,
      currentAvatarImageUrl: data.currentAvatarImageUrl,
      currentAvatarThumbnailImageUrl: data.currentAvatarThumbnailImageUrl,
    },
    "rest:detail",
    Date.now(),
  );
}

export async function updateAvatar(avatarId: string, edit: AvatarEdit): Promise<Avatar> {
  const vrc = requireActiveClient();
  const { data } = await vrc.updateAvatar({
    path: { avatarId },
    body: {
      name: edit.name,
      description: edit.description,
      releaseStatus: edit.releaseStatus as never,
    },
    throwOnError: true,
  });
  const avatar = toAvatar(data);
  invalidateAvatar(avatarId);
  avatarStore.addAvatar(avatar);
  await refreshLists(vrc);
  return avatar;
}

export async function deleteAvatar(avatarId: string): Promise<void> {
  const vrc = requireActiveClient();
  await vrc.deleteAvatar({ path: { avatarId }, throwOnError: true });
  invalidateAvatar(avatarId);
  avatarStore.removeAvatar(avatarId);
  await refreshLists(vrc);
}

export async function favoriteAvatar(avatarId: string, folder = "avatars1"): Promise<void> {
  const vrc = requireActiveClient();
  await vrc.addFavorite({
    body: { type: "avatar", favoriteId: avatarId, tags: [folder] },
    throwOnError: true,
  });
  await reloadFavorites();
}

export async function unfavoriteAvatar(avatarId: string): Promise<void> {
  const vrc = requireActiveClient();
  const fav = await findFavoriteRecord(vrc, avatarId);
  if (fav) await vrc.removeFavorite({ path: { favoriteId: fav.id }, throwOnError: true });
  await reloadFavorites();
}

export async function moveAvatarToFolder(avatarId: string, folder: string): Promise<void> {
  const vrc = requireActiveClient();
  const fav = await findFavoriteRecord(vrc, avatarId);
  if (fav?.tags?.includes(folder)) return;
  if (fav) await vrc.removeFavorite({ path: { favoriteId: fav.id }, throwOnError: true });
  await vrc.addFavorite({
    body: { type: "avatar", favoriteId: avatarId, tags: [folder] },
    throwOnError: true,
  });
  await reloadFavorites();
}

export async function updateFavoriteFolder(folder: string, edit: FavoriteGroupEdit): Promise<void> {
  const vrc = requireActiveClient();
  const me = await currentUser();
  await vrc.updateFavoriteGroup({
    path: { favoriteGroupType: "avatar", favoriteGroupName: folder, userId: me.id },
    body: {
      displayName: edit.displayName,
      visibility: edit.visibility as never,
    },
    throwOnError: true,
  });
  await reloadFavorites();
}

async function findFavoriteRecord(vrc: VRChat, avatarId: string) {
  const { data } = await vrc.getFavorites({ query: { type: "avatar", n: 100 }, throwOnError: true });
  return data.find((f) => f.favoriteId === avatarId);
}

async function reloadFavorites(): Promise<void> {
  userCache.invalidate(cacheKeys.avatarFavorites());
  await loadFavoritedAvatars();
}

function invalidateAvatar(avatarId: string): void {
  userCache.invalidate(cacheKeys.avatar(avatarId));
  userCache.invalidate(cacheKeys.avatarMine());
  userCache.invalidate(cacheKeys.avatarFavorites());
}

async function refreshLists(vrc: VRChat): Promise<void> {
  avatarStore.setMine((await getMyAvatarsRaw(vrc)).map(toAvatar));
  const { folders, limits } = await fetchFavorites(vrc);
  avatarStore.setFavorites(folders, limits);
}
