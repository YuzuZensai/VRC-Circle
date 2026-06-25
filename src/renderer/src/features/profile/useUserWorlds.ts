import { api } from "../../lib/api";
import { useAsync } from "../../lib/useAsync";
import { useAuthorWorlds } from "../../store/worlds";

export function useUserWorlds(userId: string): {
  status: "loading" | "ready" | "error";
  worlds: ReturnType<typeof useAuthorWorlds>;
  message?: string;
} {
  const state = useAsync(() => api.world.byUser(userId), [userId], "Failed to load worlds.");
  const worlds = useAuthorWorlds(userId);

  return {
    status: state.status,
    worlds,
    message: state.status === "error" ? state.message : undefined,
  };
}
