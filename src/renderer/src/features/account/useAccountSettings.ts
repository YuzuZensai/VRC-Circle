import { useCallback, useState } from "react";
import type { AccountSettings } from "../../../../shared/types/settings";
import { api } from "../../lib/api";
import { useAsync, type Async } from "../../lib/useAsync";
import { useAuth } from "../auth/AuthContext";

export function useAccountSettings(): {
  state: Async<AccountSettings>;
  reload: () => void;
  set: (s: AccountSettings) => void;
} {
  const { status } = useAuth();
  const activeId = status.state === "authenticated" ? status.user.id : null;

  const [nonce, setNonce] = useState(0);
  const [override, setOverride] = useState<AccountSettings | null>(null);

  const fetched = useAsync(
    () => api.settings.get(),
    [activeId, nonce],
    "Failed to load settings.",
  );

  const state: Async<AccountSettings> = override
    ? { status: "ready", data: override }
    : fetched;

  const reload = useCallback(() => {
    setOverride(null);
    setNonce((n) => n + 1);
  }, []);

  const set = useCallback((settings: AccountSettings) => setOverride(settings), []);

  return { state, reload, set };
}
