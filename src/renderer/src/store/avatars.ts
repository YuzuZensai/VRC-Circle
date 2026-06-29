import { useMemo } from "react";
import { create } from "zustand";
import { useShallow } from "zustand/react/shallow";
import type {
  Avatar,
  AvatarSnapshot,
  FavoriteAvatarFolder,
  FavoriteLimits,
} from "../../../shared/types/avatar";
import { api, events } from "../lib/api";

const DEFAULT_LIMITS: FavoriteLimits = { maxGroups: 6, maxPerGroup: 50 };

interface AvatarState {
  avatars: Record<string, Avatar>;
  mineIds: string[];
  favorites: FavoriteAvatarFolder[];
  favoriteLimits: FavoriteLimits;
  seed: (s: AvatarSnapshot) => void;
  upsert: (a: Avatar) => void;
}

export const useAvatars = create<AvatarState>((set) => ({
  avatars: {},
  mineIds: [],
  favorites: [],
  favoriteLimits: DEFAULT_LIMITS,
  seed: (s) =>
    set({
      avatars: Object.fromEntries(s.avatars.map((a) => [a.id, a])),
      mineIds: s.mineIds,
      favorites: s.favorites,
      favoriteLimits: s.favoriteLimits,
    }),
  upsert: (a) => set((st) => ({ avatars: { ...st.avatars, [a.id]: a } })),
}));

events.on("avatar:seed", (s) => useAvatars.getState().seed(s));
events.on("avatar:upsert", (a) => useAvatars.getState().upsert(a));
api.avatar
  .snapshot()
  .then((s) => useAvatars.getState().seed(s))
  .catch(() => {});

const fetching = new Set<string>();
const failed = new Set<string>();

export function useAvatar(avatarId?: string): { avatar?: Avatar; failed: boolean } {
  const avatar = useAvatars((s) => (avatarId ? s.avatars[avatarId] : undefined));
  if (avatarId && !avatar && !fetching.has(avatarId) && !failed.has(avatarId)) {
    fetching.add(avatarId);
    api.avatar
      .get(avatarId)
      .catch(() => failed.add(avatarId))
      .finally(() => fetching.delete(avatarId));
  }
  return { avatar, failed: avatarId ? failed.has(avatarId) : false };
}

export const useMyAvatars = (): Avatar[] =>
  useAvatars(useShallow((s) => s.mineIds.map((id) => s.avatars[id]).filter(Boolean)));

export interface FavoriteFolder {
  name: string;
  displayName: string;
  visibility: FavoriteAvatarFolder["visibility"];
  count: number;
  full: boolean;
  avatars: Avatar[];
}

export function useFavoriteAvatars(): FavoriteFolder[] {
  const favorites = useAvatars((s) => s.favorites);
  const avatars = useAvatars((s) => s.avatars);
  const maxPerGroup = useAvatars((s) => s.favoriteLimits.maxPerGroup);
  return useMemo(
    () => favorites.map((f) => toFolder(f, avatars, maxPerGroup)),
    [favorites, avatars, maxPerGroup],
  );
}

function toFolder(
  f: FavoriteAvatarFolder,
  avatars: Record<string, Avatar>,
  maxPerGroup: number,
): FavoriteFolder {
  return {
    name: f.name,
    displayName: f.displayName,
    visibility: f.visibility,
    count: f.avatarIds.length,
    full: f.avatarIds.length >= maxPerGroup,
    avatars: f.avatarIds.map((id) => avatars[id]).filter((a): a is Avatar => Boolean(a)),
  };
}

export const useFavoriteLimits = (): FavoriteLimits => useAvatars((s) => s.favoriteLimits);

export function useAvatarFolder(avatarId: string): string | undefined {
  return useAvatars((s) => s.favorites.find((f) => f.avatarIds.includes(avatarId))?.name);
}

export interface FolderSlot {
  name: string;
  displayName: string;
  count: number;
  full: boolean;
}

export function useFolderSlots(): FolderSlot[] {
  const favorites = useAvatars((s) => s.favorites);
  const maxPerGroup = useAvatars((s) => s.favoriteLimits.maxPerGroup);
  return useMemo(
    () =>
      favorites.map((f) => ({
        name: f.name,
        displayName: f.displayName,
        count: f.avatarIds.length,
        full: f.avatarIds.length >= maxPerGroup,
      })),
    [favorites, maxPerGroup],
  );
}
