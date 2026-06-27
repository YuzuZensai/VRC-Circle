import { create } from "zustand";
import { useShallow } from "zustand/react/shallow";
import type { Group, GroupSnapshot } from "../../../shared/types/group";
import { api, events } from "../lib/api";

interface GroupState {
  groups: Record<string, Group>;
  byUser: Record<string, string[]>;
  representedByUser: Record<string, string>;
  seed: (s: GroupSnapshot) => void;
  upsert: (g: Group) => void;
}

export const useGroups = create<GroupState>((set) => ({
  groups: {},
  byUser: {},
  representedByUser: {},
  seed: (s) =>
    set({
      groups: Object.fromEntries(s.groups.map((g) => [g.id, g])),
      byUser: s.byUser,
      representedByUser: s.representedByUser,
    }),
  upsert: (g) => set((st) => ({ groups: { ...st.groups, [g.id]: g } })),
}));

events.on("group:seed", (s) => useGroups.getState().seed(s));
events.on("group:upsert", (g) => useGroups.getState().upsert(g));
api.group
  .snapshot()
  .then((s) => useGroups.getState().seed(s))
  .catch(() => {});

const fetching = new Set<string>();
const failed = new Set<string>();

export function useGroup(groupId?: string): Group | undefined {
  const group = useGroups((s) => (groupId ? s.groups[groupId] : undefined));
  if (groupId && !group?.detailed && !fetching.has(groupId) && !failed.has(groupId)) {
    fetching.add(groupId);
    api.group
      .get(groupId)
      .catch(() => failed.add(groupId))
      .finally(() => fetching.delete(groupId));
  }
  return group;
}

export const useAllGroups = (): Group[] => useGroups(useShallow((s) => Object.values(s.groups)));

export const useUserGroupList = (userId: string): Group[] =>
  useGroups(useShallow((s) => (s.byUser[userId] ?? []).map((id) => s.groups[id]).filter(Boolean)));

export const useRepresentedGroup = (userId: string): Group | undefined =>
  useGroups((s) => {
    const id = s.representedByUser[userId];
    return id ? s.groups[id] : undefined;
  });
