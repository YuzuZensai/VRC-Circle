import { useCallback, useEffect, useState } from "react";
import type { AccountSettings } from "../../../../shared/types/settings";
import { api, errorMessage } from "../../lib/api";
import { useAuth } from "../auth/AuthContext";

type State =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; settings: AccountSettings };

export function useAccountSettings(): {
  state: State;
  reload: () => void;
  set: (s: AccountSettings) => void;
} {
  const { status } = useAuth();
  const activeId = status.state === "authenticated" ? status.user.id : null;
  const [state, setState] = useState<State>({ status: "loading" });

  const reload = useCallback(() => {
    setState({ status: "loading" });
    api.settings
      .get()
      .then((settings) => setState({ status: "ready", settings }))
      .catch((err) =>
        setState({
          status: "error",
          message: errorMessage(err, "Failed to load settings."),
        }),
      );
  }, []);

  useEffect(() => {
    reload();
  }, [reload, activeId]);

  const set = useCallback(
    (settings: AccountSettings) => setState({ status: "ready", settings }),
    [],
  );

  return { state, reload, set };
}
