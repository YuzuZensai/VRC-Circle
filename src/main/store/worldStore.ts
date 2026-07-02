import type { World, WorldSnapshot } from "../../shared/types/world";
import type { FieldSource } from "../../shared/types/repository";
import { repos } from "./repository/manager";

export type { WorldSnapshot };

type Change = { type: "seed"; snapshot: WorldSnapshot } | { type: "upsert"; world: World };
type Listener = (change: Change) => void;

class WorldStore {
  private readonly listeners = new Set<Listener>();
  private byAuthor = new Map<string, Set<string>>();
  private unwire: (() => void) | null = null;

  onChange(fn: Listener): () => void {
    this.wire();
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  private wire(): void {
    if (this.unwire || !repos.hasActive) return;
    this.unwire = repos.active.worlds.onChange((c) => {
      this.emit({ type: "upsert", world: c.entity });
    });
  }

  setAuthorWorlds(authorId: string, worlds: World[]): void {
    this.byAuthor.set(authorId, new Set(worlds.map((w) => w.id)));
    repos.active.worlds.upsertMany(worlds, "rest:list");
    this.emit({ type: "seed", snapshot: this.snapshot() });
  }

  addWorld(world: World, src: FieldSource = world.detailed ? "rest:detail" : "rest:list"): void {
    repos.active.worlds.upsert(world, src);
  }

  authorWorlds(authorId: string): World[] {
    const ids = this.byAuthor.get(authorId);
    if (!ids) return [];
    return repos.active.worlds.getMany([...ids]);
  }

  get(worldId: string): World | undefined {
    return repos.active.worlds.get(worldId);
  }

  snapshot(): WorldSnapshot {
    return {
      worlds: repos.hasActive ? repos.active.worlds.all() : [],
      byAuthor: Object.fromEntries([...this.byAuthor].map(([k, v]) => [k, [...v]])),
    };
  }

  reset(): void {
    this.byAuthor.clear();
    this.unwire?.();
    this.unwire = null;
    this.wire();
    this.emit({ type: "seed", snapshot: this.snapshot() });
  }

  private emit(change: Change): void {
    for (const fn of this.listeners) fn(change);
  }
}

export const worldStore = new WorldStore();
