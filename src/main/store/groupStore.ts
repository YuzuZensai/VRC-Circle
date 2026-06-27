import type { Group, GroupSnapshot } from "../../shared/types/group";
import type { FieldSource } from "../../shared/types/repository";
import { repos } from "./repository/manager";

export type { GroupSnapshot };

type Change = { type: "seed"; snapshot: GroupSnapshot } | { type: "upsert"; group: Group };
type Listener = (change: Change) => void;

class GroupStore {
  private readonly listeners = new Set<Listener>();
  private byUser = new Map<string, Set<string>>();
  private representedByUser = new Map<string, string>();
  private wired = false;

  onChange(fn: Listener): () => void {
    this.wire();
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  private wire(): void {
    if (this.wired || !repos.hasActive) return;
    this.wired = true;
    repos.active.groups.onChange((c) => {
      this.emit({ type: "upsert", group: c.entity });
    });
  }

  setUserGroups(userId: string, groups: Group[]): void {
    this.byUser.set(userId, new Set(groups.map((g) => g.id)));
    repos.active.groups.upsertMany(groups, "rest:list");
    this.emit({ type: "seed", snapshot: this.snapshot() });
  }

  setRepresented(userId: string, group: Group | null): void {
    if (group) {
      this.representedByUser.set(userId, group.id);
      repos.active.groups.upsert(group, "rest:list");
    } else {
      this.representedByUser.delete(userId);
    }
    this.emit({ type: "seed", snapshot: this.snapshot() });
  }

  addGroup(group: Group, src: FieldSource = group.detailed ? "rest:detail" : "rest:list"): void {
    repos.active.groups.upsert(group, src);
  }

  get(groupId: string): Group | undefined {
    return repos.active.groups.get(groupId);
  }

  snapshot(): GroupSnapshot {
    return {
      groups: repos.hasActive ? repos.active.groups.all() : [],
      byUser: Object.fromEntries([...this.byUser].map(([k, v]) => [k, [...v]])),
      representedByUser: Object.fromEntries(this.representedByUser),
    };
  }

  reset(): void {
    this.byUser.clear();
    this.representedByUser.clear();
    this.wired = false;
    this.wire();
    this.emit({ type: "seed", snapshot: this.snapshot() });
  }

  private emit(change: Change): void {
    for (const fn of this.listeners) fn(change);
  }
}

export const groupStore = new GroupStore();
