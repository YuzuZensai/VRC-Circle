import type { Group } from "../../../../shared/types/group";
import { api } from "../../lib/api";
import { useAsync } from "../../lib/useAsync";

type Status = "loading" | "ready" | "error";

export function useUserGroups(userId: string): {
  status: Status;
  groups: Group[];
  represented: Group | null;
  message?: string;
} {
  const state = useAsync(
    () =>
      Promise.all([api.group.byUser(userId), api.group.represented(userId)]).then(
        ([groups, represented]) => ({ groups, represented }),
      ),
    [userId],
    "Failed to load groups.",
  );

  if (state.status === "ready") {
    return { status: "ready", groups: state.data.groups, represented: state.data.represented };
  }
  return {
    status: state.status,
    groups: [],
    represented: null,
    message: state.status === "error" ? state.message : undefined,
  };
}
