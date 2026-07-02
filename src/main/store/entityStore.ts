import type { SocialSnapshot, UserProfile } from "../../shared/types/user";
import type { FieldSource } from "../../shared/types/repository";
import { repos } from "./repository/manager";

export type { SocialSnapshot };

type Change = { type: "seed"; snapshot: SocialSnapshot } | { type: "upsert"; user: UserProfile };
type Listener = (change: Change) => void;

class EntityStore {
  private readonly listeners = new Set<Listener>();
  private selfId: string | null = null;
  private unwire: (() => void) | null = null;

  onChange(fn: Listener): () => void {
    this.wire();
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  private wire(): void {
    if (this.unwire || !repos.hasActive) return;
    this.unwire = repos.active.users.onChange((c) => {
      this.emit({ type: "upsert", user: c.entity });
    });
  }

  private rewire(): void {
    this.unwire?.();
    this.unwire = null;
    this.wire();
  }

  seed(self: UserProfile, friends: UserProfile[]): void {
    this.rewire();
    this.selfId = self.id;
    const users = repos.active.users;
    users.upsert(self, "rest:detail");
    for (const f of friends) users.upsert({ ...f, isFriend: true }, "rest:list");
    this.emit({ type: "seed", snapshot: this.snapshot() });
  }

  upsert(partial: Partial<UserProfile> & { id: string }, at?: number): void {
    this.upsertFrom(partial, "ws", at);
  }

  upsertFrom(partial: Partial<UserProfile> & { id: string }, src: FieldSource, at?: number): void {
    if (!repos.hasActive) return;
    repos.active.users.upsert(partial, src, at);
  }

  addFriend(user: UserProfile): void {
    repos.active.users.upsert({ ...user, isFriend: true }, "rest:detail");
  }

  removeFriend(id: string): void {
    repos.active.users.upsert({ id, isFriend: false }, "rest:detail");
  }

  get(id: string): UserProfile | undefined {
    return repos.hasActive ? repos.active.users.get(id) : undefined;
  }

  friends(): UserProfile[] {
    return repos.hasActive ? repos.active.users.filter((u) => u.isFriend) : [];
  }

  snapshot(): SocialSnapshot {
    return {
      selfId: this.selfId,
      users: repos.hasActive ? repos.active.users.all() : [],
    };
  }

  reset(): void {
    this.selfId = null;
    this.rewire();
    this.emit({ type: "seed", snapshot: this.snapshot() });
  }

  clear(): void {
    this.selfId = null;
    this.emit({ type: "seed", snapshot: this.snapshot() });
  }

  private emit(change: Change): void {
    for (const fn of this.listeners) fn(change);
  }
}

export const entityStore = new EntityStore();
