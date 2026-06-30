import type {
  FavoriteLimits,
  FavoriteVisibility,
  FavoriteWorldGroup,
  World,
  WorldFavoritesSnapshot,
} from "../../shared/types/world";
import { worldStore } from "./worldStore";

const DEFAULT_LIMITS: FavoriteLimits = { maxGroups: 4, maxPerGroup: 64 };

export type FavoriteGroupInput = {
  name: string;
  displayName: string;
  visibility: FavoriteVisibility;
  worlds: World[];
  vrcPlus: boolean;
};

type Listener = (snapshot: WorldFavoritesSnapshot) => void;

class WorldFavoritesStore {
  private readonly listeners = new Set<Listener>();
  private groups: FavoriteWorldGroup[] = [];
  private limits: FavoriteLimits = DEFAULT_LIMITS;

  onChange(fn: Listener): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  setFavorites(groups: FavoriteGroupInput[], limits?: FavoriteLimits): void {
    this.groups = groups.map((g) => ({
      name: g.name,
      displayName: g.displayName,
      visibility: g.visibility,
      worldIds: g.worlds.map((w) => w.id),
      vrcPlus: g.vrcPlus,
    }));
    if (limits) this.limits = limits;
    for (const g of groups) for (const w of g.worlds) worldStore.addWorld(w);
    this.emit();
  }

  moveWorld(worldId: string, folder: string): void {
    let changed = false;
    this.groups = this.groups.map((g) => {
      const without = g.worldIds.filter((id) => id !== worldId);
      const worldIds = g.name === folder ? [...without, worldId] : without;
      if (worldIds.length !== g.worldIds.length || worldIds.some((id, i) => id !== g.worldIds[i])) {
        changed = true;
      }
      return { ...g, worldIds };
    });
    if (changed) this.emit();
  }

  snapshot(): WorldFavoritesSnapshot {
    return { groups: this.groups, limits: this.limits };
  }

  reset(): void {
    this.groups = [];
    this.limits = DEFAULT_LIMITS;
    this.emit();
  }

  private emit(): void {
    const snap = this.snapshot();
    for (const fn of this.listeners) fn(snap);
  }
}

export const worldFavoritesStore = new WorldFavoritesStore();
