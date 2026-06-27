import type { Group } from "../../../../shared/types/group";
import { api } from "../../lib/api";
import { useAsync } from "../../lib/useAsync";
import { useUserGroupList, useRepresentedGroup } from "../../store/groups";

type Status = "loading" | "ready" | "error";

export function useUserGroups(userId: string): {
  status: Status;
  groups: Group[];
  represented: Group | null;
  message?: string;
} {
  const groups = useUserGroupList(userId);
  const represented = useRepresentedGroup(userId) ?? null;

  const state = useAsync(
    () => Promise.all([api.group.byUser(userId), api.group.represented(userId)]),
    [userId],
    "Failed to load groups.",
  );

  if (groups.length || represented) return { status: "ready", groups, represented };
  if (state.status === "error")
    return { status: "error", groups, represented, message: state.message };
  return { status: state.status === "ready" ? "ready" : "loading", groups, represented };
}
