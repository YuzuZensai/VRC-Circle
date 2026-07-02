import type {
  Avatar,
  AvatarSnapshot,
  FavoriteAvatarFolder,
  FavoriteLimits,
  FavoriteVisibility,
} from "../../shared/types/avatar";
import type { FieldSource } from "../../shared/types/repository";
import { repos } from "./repository/manager";

const DEFAULT_LIMITS: FavoriteLimits = { maxGroups: 6, maxPerGroup: 50 };

export type FavoriteFolderInput = {
  name: string;
  displayName: string;
  visibility: FavoriteVisibility;
  avatars: Avatar[];
};

export type { AvatarSnapshot };

type Change = { type: "seed"; snapshot: AvatarSnapshot } | { type: "upsert"; avatar: Avatar };
type Listener = (change: Change) => void;

class AvatarStore {
  private readonly listeners = new Set<Listener>();
  private mineIds = new Set<string>();
  private favorites: FavoriteAvatarFolder[] = [];
  private favoriteLimits: FavoriteLimits = DEFAULT_LIMITS;
  private unwire: (() => void) | null = null;

  onChange(fn: Listener): () => void {
    this.wire();
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  private wire(): void {
    if (this.unwire || !repos.hasActive) return;
    this.unwire = repos.active.avatars.onChange((c) => {
      this.emit({ type: "upsert", avatar: c.entity });
    });
  }

  setMine(avatars: Avatar[]): void {
    this.mineIds = new Set(avatars.map((a) => a.id));
    repos.active.avatars.upsertMany(avatars, "rest:list");
    this.emit({ type: "seed", snapshot: this.snapshot() });
  }

  setFavorites(folders: FavoriteFolderInput[], limits?: FavoriteLimits): void {
    this.favorites = folders.map((f) => ({
      name: f.name,
      displayName: f.displayName,
      visibility: f.visibility,
      avatarIds: f.avatars.map((a) => a.id),
    }));
    if (limits) this.favoriteLimits = limits;
    for (const f of folders) repos.active.avatars.upsertMany(f.avatars, "rest:list");
    this.emit({ type: "seed", snapshot: this.snapshot() });
  }

  addAvatar(avatar: Avatar, src: FieldSource = "rest:detail"): void {
    repos.active.avatars.upsert(avatar, src);
  }

  removeAvatar(avatarId: string): void {
    this.mineIds.delete(avatarId);
    this.favorites = this.favorites
      .map((f) => ({ ...f, avatarIds: f.avatarIds.filter((id) => id !== avatarId) }))
      .filter((f) => f.avatarIds.length);
    repos.active.avatars.remove(avatarId);
    this.emit({ type: "seed", snapshot: this.snapshot() });
  }

  get(avatarId: string): Avatar | undefined {
    return repos.active.avatars.get(avatarId);
  }

  snapshot(): AvatarSnapshot {
    return {
      avatars: repos.hasActive ? repos.active.avatars.all() : [],
      mineIds: [...this.mineIds],
      favorites: this.favorites,
      favoriteLimits: this.favoriteLimits,
    };
  }

  reset(): void {
    this.mineIds.clear();
    this.favorites = [];
    this.favoriteLimits = DEFAULT_LIMITS;
    this.unwire?.();
    this.unwire = null;
    this.wire();
    this.emit({ type: "seed", snapshot: this.snapshot() });
  }

  private emit(change: Change): void {
    for (const fn of this.listeners) fn(change);
  }
}

export const avatarStore = new AvatarStore();
