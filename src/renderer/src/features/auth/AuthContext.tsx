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
import { api, events } from "../../lib/api";

interface AuthContextValue {
  status: AuthStatus;
  accounts: AccountsState;
  loading: boolean;
  adding: boolean;
  login: (username: string, password: string) => Promise<void>;
  verify2fa: (method: TwoFactorMethod, code: string) => Promise<void>;
  logout: () => Promise<void>;
  switchAccount: (id: string) => Promise<void>;
  removeAccount: (id: string) => Promise<void>;
  beginAddAccount: () => void;
  cancelAddAccount: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);
const EMPTY: AccountsState = { accounts: [], activeId: null };

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
    api.auth
      .status()
      .then(setStatus)
      .catch(() => setStatus({ state: "unauthenticated" }))
      .finally(() => setLoading(false));
    refreshAccounts();

    const offAuth = events.on("auth:changed", setStatus);
    const offAcc = events.on("accounts:changed", setAccounts);
    return () => {
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

  const logout = useCallback(async () => {
    await api.auth.logout();
    const next = await api.auth.status();
    setStatus(next);
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
    setStatus(await api.auth.status());
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
