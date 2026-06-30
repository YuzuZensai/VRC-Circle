import { useMemo } from "react";
import { create } from "zustand";
import type {
  FavoriteLimits,
  FavoriteWorldGroup,
  World,
  WorldFavoritesSnapshot,
} from "../../../shared/types/world";
import { api, events } from "../lib/api";
import { useWorlds } from "./worlds";

const DEFAULT_LIMITS: FavoriteLimits = { maxGroups: 4, maxPerGroup: 64 };

interface WorldFavoritesState {
  groups: FavoriteWorldGroup[];
  limits: FavoriteLimits;
  loaded: boolean;
  seed: (s: WorldFavoritesSnapshot) => void;
  markStale: () => void;
}

export const useWorldFavorites = create<WorldFavoritesState>((set) => ({
  groups: [],
  limits: DEFAULT_LIMITS,
  loaded: false,
  seed: (s) => set({ groups: s.groups, limits: s.limits, loaded: true }),
  markStale: () => set({ loaded: false }),
}));

events.on("world:favorites:seed", (s) => useWorldFavorites.getState().seed(s));
api.world
  .favoritesSnapshot()
  .then((s) => useWorldFavorites.getState().seed(s))
  .catch(() => {});

export interface FavoriteFolder {
  name: string;
  displayName: string;
  visibility: FavoriteWorldGroup["visibility"];
  count: number;
  full: boolean;
  vrcPlus: boolean;
  worlds: World[];
}

export function useFavoriteWorldFolders(): FavoriteFolder[] {
  const groups = useWorldFavorites((s) => s.groups);
  const worlds = useWorlds((s) => s.worlds);
  const maxPerGroup = useWorldFavorites((s) => s.limits.maxPerGroup);
  return useMemo(
    () => groups.map((g) => toFolder(g, worlds, maxPerGroup)),
    [groups, worlds, maxPerGroup],
  );
}

function toFolder(
  g: FavoriteWorldGroup,
  worlds: Record<string, World>,
  maxPerGroup: number,
): FavoriteFolder {
  return {
    name: g.name,
    displayName: g.displayName,
    visibility: g.visibility,
    count: g.worldIds.length,
    full: g.worldIds.length >= maxPerGroup,
    vrcPlus: g.vrcPlus,
    worlds: g.worldIds.map((id) => worlds[id]).filter((w): w is World => Boolean(w)),
  };
}

export const useWorldFavoriteLimits = (): FavoriteLimits => useWorldFavorites((s) => s.limits);

export const useWorldFavoritesLoaded = (): boolean => useWorldFavorites((s) => s.loaded);

export function useWorldFolder(worldId: string): string | undefined {
  return useWorldFavorites((s) => s.groups.find((g) => g.worldIds.includes(worldId))?.name);
}

export interface FolderSlot {
  name: string;
  displayName: string;
  count: number;
  full: boolean;
  vrcPlus: boolean;
}

export function useWorldFolderSlots(): FolderSlot[] {
  const groups = useWorldFavorites((s) => s.groups);
  const maxPerGroup = useWorldFavorites((s) => s.limits.maxPerGroup);
  return useMemo(
    () =>
      groups.map((g) => ({
        name: g.name,
        displayName: g.displayName,
        count: g.worldIds.length,
        full: g.worldIds.length >= maxPerGroup,
        vrcPlus: g.vrcPlus,
      })),
    [groups, maxPerGroup],
  );
}
