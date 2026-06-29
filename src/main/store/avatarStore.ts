import type { Avatar, AvatarSnapshot, FavoriteAvatarFolder } from "../../shared/types/avatar";
import type { FieldSource } from "../../shared/types/repository";
import { repos } from "./repository/manager";

export type { AvatarSnapshot };

type Change = { type: "seed"; snapshot: AvatarSnapshot } | { type: "upsert"; avatar: Avatar };
type Listener = (change: Change) => void;

class AvatarStore {
  private readonly listeners = new Set<Listener>();
  private mineIds = new Set<string>();
  private favorites: FavoriteAvatarFolder[] = [];
  private wired = false;

  onChange(fn: Listener): () => void {
    this.wire();
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  private wire(): void {
    if (this.wired || !repos.hasActive) return;
    this.wired = true;
    repos.active.avatars.onChange((c) => {
      this.emit({ type: "upsert", avatar: c.entity });
    });
  }

  setMine(avatars: Avatar[]): void {
    this.mineIds = new Set(avatars.map((a) => a.id));
    repos.active.avatars.upsertMany(avatars, "rest:list");
    this.emit({ type: "seed", snapshot: this.snapshot() });
  }

  setFavorites(folders: { name: string; displayName: string; avatars: Avatar[] }[]): void {
    this.favorites = folders.map((f) => ({
      name: f.name,
      displayName: f.displayName,
      avatarIds: f.avatars.map((a) => a.id),
    }));
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
    };
  }

  reset(): void {
    this.mineIds.clear();
    this.favorites = [];
    this.wired = false;
    this.wire();
    this.emit({ type: "seed", snapshot: this.snapshot() });
  }

  private emit(change: Change): void {
    for (const fn of this.listeners) fn(change);
  }
}

export const avatarStore = new AvatarStore();
