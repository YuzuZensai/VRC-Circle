import type { VRChat } from "vrchat";
import type { Avatar, AvatarEdit, AvatarSnapshot } from "../../shared/types/avatar";
import { toAvatar } from "./mappers";
import { httpStatusOf } from "./errors";
import { cachedRead } from "./cachedRead";
import { requireActiveClient } from "./client";
import { userCache } from "./userService";
import { entityStore } from "../store/entityStore";
import { avatarStore } from "../store/avatarStore";
import { cacheKeys, policies } from "../cache/policies";
import { getAvatarRaw, getMyAvatarsRaw, getFavoritedAvatarsRaw } from "./rawEndpoints";

type FavoriteFolder = { name: string; displayName: string; avatars: Avatar[] };

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
  const folders = await cachedRead(
    cacheKeys.avatarFavorites(),
    policies.avatarFavorites,
    fetchFavoriteFolders,
  );
  avatarStore.setFavorites(folders);
}

async function fetchFavoriteFolders(vrc: VRChat): Promise<FavoriteFolder[]> {
  const { data: groups } = await vrc.getFavoriteGroups({
    query: { n: 100 },
    throwOnError: true,
  });
  const avatarGroups = groups.filter((g) => g.type === "avatar");

  const folders: FavoriteFolder[] = [];
  for (const group of avatarGroups) {
    let raw;
    try {
      raw = await getFavoritedAvatarsRaw(vrc, group.name);
    } catch (err) {
      if (httpStatusOf(err) === 401 || httpStatusOf(err) === 403) continue;
      throw err;
    }
    if (!raw.length) continue;
    folders.push({
      name: group.name,
      displayName: group.displayName || prettyFolderName(group.name),
      avatars: raw.map(toAvatar),
    });
  }
  return folders;
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

export async function setAvatarFavorited(avatarId: string, favorited: boolean): Promise<void> {
  const vrc = requireActiveClient();
  if (favorited) {
    await vrc.addFavorite({
      body: { type: "avatar", favoriteId: avatarId, tags: ["avatars1"] },
      throwOnError: true,
    });
  } else {
    const { data } = await vrc.getFavorites({ query: { type: "avatar", n: 100 }, throwOnError: true });
    const fav = data.find((f) => f.favoriteId === avatarId);
    if (fav) await vrc.removeFavorite({ path: { favoriteId: fav.id }, throwOnError: true });
  }
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
  avatarStore.setFavorites(await fetchFavoriteFolders(vrc));
}
