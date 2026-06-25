import type { UserProfile } from "../../../../shared/types/user";
import { api } from "../../lib/api";
import { useAsync } from "../../lib/useAsync";
import { useSocial } from "../../store/social";

type State =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; profile: UserProfile };

export function useProfile(target: "me" | string): State {
  const fromStore = useSocial((s) => {
    const id = target === "me" ? s.selfId : target;
    return id ? s.users[id] : undefined;
  });

  const fetched = useAsync(
    () => (target === "me" ? api.user.me() : api.user.get(target)),
    [target],
    "Failed to load profile.",
  );

  if (fromStore) return { status: "ready", profile: fromStore };
  if (fetched.status === "ready") return { status: "ready", profile: fetched.data };
  return fetched;
}
