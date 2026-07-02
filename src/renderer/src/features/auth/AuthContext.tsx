import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { AccountsState, AuthStatus, TwoFactorMethod } from "../../../../shared/types/auth";
import { api, events, isRetryableApiError } from "../../lib/api";

interface AuthContextValue {
  status: AuthStatus;
  accounts: AccountsState;
  loading: boolean;
  adding: boolean;
  login: (username: string, password: string) => Promise<void>;
  verify2fa: (method: TwoFactorMethod, code: string) => Promise<void>;
  cancel2fa: () => Promise<void>;
  logout: () => Promise<void>;
  switchAccount: (id: string) => Promise<void>;
  removeAccount: (id: string) => Promise<void>;
  beginAddAccount: () => void;
  cancelAddAccount: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);
const EMPTY: AccountsState = { accounts: [], activeId: null };

function statusOrLoggedOut(): Promise<AuthStatus> {
  return api.auth.status().catch(() => ({ state: "unauthenticated" as const }));
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>({ state: "unauthenticated" });
  const [accounts, setAccounts] = useState<AccountsState>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);

  const refreshAccounts = useCallback(() => {
    api.accounts
      .list()
      .then(setAccounts)
      .catch(() => setAccounts(EMPTY));
  }, []);

  useEffect(() => {
    let cancelled = false;
    const check = async (attempt: number): Promise<void> => {
      try {
        const next = await api.auth.status();
        if (cancelled) return;
        setStatus(next);
        setLoading(false);
      } catch (err) {
        if (cancelled) return;
        if (isRetryableApiError(err) && attempt < 3) {
          window.setTimeout(() => void check(attempt + 1), 1500 * 2 ** attempt);
          return;
        }
        setStatus({ state: "unauthenticated" });
        setLoading(false);
      }
    };
    void check(0);
    refreshAccounts();

    const offAuth = events.on("auth:changed", setStatus);
    const offAcc = events.on("accounts:changed", setAccounts);
    return () => {
      cancelled = true;
      offAuth();
      offAcc();
    };
  }, [refreshAccounts]);

  const login = useCallback(
    async (username: string, password: string) => {
      const next = await api.auth.login(username, password);
      setStatus(next);
      if (next.state === "authenticated") {
        setAdding(false);
        refreshAccounts();
      }
    },
    [refreshAccounts],
  );

  const verify2fa = useCallback(
    async (method: TwoFactorMethod, code: string) => {
      const next = await api.auth.verify2fa(method, code);
      setStatus(next);
      if (next.state === "authenticated") {
        setAdding(false);
        refreshAccounts();
      }
    },
    [refreshAccounts],
  );

  const cancel2fa = useCallback(async () => {
    setStatus(await api.auth.cancel2fa());
  }, []);

  const logout = useCallback(async () => {
    await api.auth.logout();
    setStatus(await statusOrLoggedOut());
    refreshAccounts();
  }, [refreshAccounts]);

  const switchAccount = useCallback(
    async (id: string) => {
      setStatus(await api.accounts.switch(id));
      setAdding(false);
      refreshAccounts();
    },
    [refreshAccounts],
  );

  const removeAccount = useCallback(async (id: string) => {
    setAccounts(await api.accounts.remove(id));
    setStatus(await statusOrLoggedOut());
  }, []);

  const beginAddAccount = useCallback(() => setAdding(true), []);
  const cancelAddAccount = useCallback(() => setAdding(false), []);

  const value = useMemo(
    () => ({
      status,
      accounts,
      loading,
      adding,
      login,
      verify2fa,
      cancel2fa,
      logout,
      switchAccount,
      removeAccount,
      beginAddAccount,
      cancelAddAccount,
    }),
    [
      status,
      accounts,
      loading,
      adding,
      login,
      verify2fa,
      cancel2fa,
      logout,
      switchAccount,
      removeAccount,
      beginAddAccount,
      cancelAddAccount,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within <AuthProvider>");
  return ctx;
}
