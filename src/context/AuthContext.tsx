import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from "react";
import { VRChatService } from "../services/vrchat";
import { AccountService } from "../services/account";
import { WebSocketService } from "../services/websocket";
import { userStore, accountsStore } from "@/stores";
import { setActiveAccountId } from "@/stores/account-scope";
import type { User } from "../types/bindings";

interface AuthContextType {
  user: User | null;
  loading: boolean;
  twoFactorMethods: string[];
  login: (
    email: string,
    password: string
  ) => Promise<"success" | "needs_2fa" | "error">;
  verify2FA: (code: string, method: string) => Promise<boolean>;
  logout: () => Promise<void>;
  clearLocalSession: () => Promise<void>;
  setUser: (user: User | null) => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUserState] = useState<User | null>(userStore.getSnapshot());
  const [loading, setLoading] = useState(true);
  const [twoFactorMethods, setTwoFactorMethods] = useState<string[]>([]);

  const checkAuth = useCallback(async () => {
    setLoading(true);
    try {
      // Eagerly load accounts cache first to avoid loading spinner in AccountSwitcher
      // Ensure cache is populated before UI renders
      await accountsStore.ensure().catch(() => undefined);

      if (userStore.getSnapshot()) {
        return;
      }

      const savedUser = await AccountService.loadLastAccount();
      if (savedUser) {
        setActiveAccountId(savedUser.id);
        userStore.set(savedUser, { stale: true });

        WebSocketService.start().catch((err) =>
          console.error("Failed to start WebSocket:", err)
        );

        // Warm the cache in the background
        userStore.ensure({ force: true }).catch(() => undefined);
        userStore.ensureFriends({ force: true }).catch(() => undefined);
        return;
      }

      const hasSession = await VRChatService.checkSession();
      if (hasSession) {
        const currentUser = await userStore.refresh();
        setActiveAccountId(currentUser.id);

        WebSocketService.start().catch((err) =>
          console.error("Failed to start WebSocket:", err)
        );

        userStore.ensureFriends({ force: true }).catch(() => undefined);
      } else {
        userStore.clear();
        userStore.clearFriends();
        setActiveAccountId(null);
      }
    } catch {
      userStore.clear();
      userStore.clearFriends();
      setActiveAccountId(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const unsubscribe = userStore.subscribe((value) => {
      setUserState(value);
    });
    checkAuth();

    return () => {
      unsubscribe();
      WebSocketService.stop().catch(() => undefined);
    };
  }, [checkAuth]);

  useEffect(() => {
    if (typeof window === "undefined" || !(window as any).__TAURI_IPC__) {
      return;
    }

    let isDisposed = false;
    const unlistenFns: Array<() => void> = [];

    (async () => {
      try {
        const { listen } = await import("@tauri-apps/api/event");

        const addListener = async (event: string, handler: () => void) => {
          const unlisten = await listen(event, () => {
            if (!isDisposed) {
              handler();
            }
          });
          unlistenFns.push(unlisten);
        };

        const refreshCurrentUser = () => {
          userStore.refresh().catch((error) => {
            console.error(`Failed to refresh user after ${"event"}`, error);
          });
        };

        const refreshFriends = () => {
          userStore.refreshFriends().catch((error) => {
            console.error("Failed to refresh friends after event", error);
          });
        };

        await addListener("user-update", refreshCurrentUser);
        await addListener("user-location", refreshCurrentUser);

        // TODO: Strongly type these events
        const friendEvents = [
          "friend-added",
          "friend-update",
          "friend-online",
          "friend-active",
          "friend-offline",
          "friend-location",
          "friend-removed",
        ];

        await Promise.all(
          friendEvents.map((event) => addListener(event, refreshFriends))
        );
      } catch (error) {
        console.error("Failed to set up Tauri event listeners", error);
      }
    })();

    return () => {
      isDisposed = true;
      for (const unlisten of unlistenFns) {
        try {
          unlisten();
        } catch (error) {
          console.error("Failed to remove Tauri event listener", error);
        }
      }
    };
  }, []);

  const login = async (
    email: string,
    password: string
  ): Promise<"success" | "needs_2fa" | "error"> => {
    const response = await VRChatService.login(email, password);

    if (response.type === "Success") {
      // First switch active account ID, then cache user data
      // This ensures userStore.set() emits to subscribers
      setActiveAccountId(response.user.id);
      userStore.set(response.user, { stale: true, scopeId: response.user.id });

      let currentUser = response.user;
      try {
        currentUser = await userStore.refresh();
        await userStore.ensureFriends({ force: true });
      } catch (error) {
        console.error("Failed to refresh user after login", error);
        userStore.set(response.user, { scopeId: response.user.id });
        userStore.ensureFriends({ force: true }).catch(() => undefined);
      }

      setTwoFactorMethods([]);
      await accountsStore.saveFromUser(currentUser).catch((error) => {
        console.error("Failed to save account after login", error);
      });
      await accountsStore.refresh();
      WebSocketService.start().catch((err) =>
        console.error("Failed to start WebSocket:", err)
      );
      return "success";
    } else if (response.type === "TwoFactorRequired") {
      setTwoFactorMethods(response.methods);
      return "needs_2fa";
    }
    return "error";
  };

  const verify2FA = async (code: string, method: string): Promise<boolean> => {
    const verified = await VRChatService.verify2FA(code, method);

    if (verified) {
      let currentUser: User | null = null;
      try {
        currentUser = await userStore.refresh();
        await userStore.ensureFriends({ force: true });
      } catch (error) {
        console.error("Failed to refresh user after 2FA", error);
      }

      if (!currentUser) {
        try {
          currentUser = await VRChatService.getCurrentUser();
          // Set active account ID before setting user in store to ensure emit happens
          setActiveAccountId(currentUser.id);
          userStore.set(currentUser, { scopeId: currentUser.id });
          userStore.ensureFriends({ force: true }).catch(() => undefined);
        } catch (fetchError) {
          console.error("Failed to fetch current user after 2FA", fetchError);
          return false;
        }
      } else {
        setActiveAccountId(currentUser.id);
        userStore.ensureFriends({ force: true }).catch(() => undefined);
      }

      setTwoFactorMethods([]);
      await accountsStore.saveFromUser(currentUser).catch((error) => {
        console.error("Failed to save account after 2FA", error);
      });
      await accountsStore.refresh();
      WebSocketService.start().catch((err) =>
        console.error("Failed to start WebSocket:", err)
      );
      return true;
    }
    return false;
  };

  const logout = async () => {
    const currentUserId = user?.id;
    try {
      await VRChatService.logout();
    } catch (error) {
      console.error("Logout failed", error);
    } finally {
      userStore.clear();
      userStore.clearFriends();
      setActiveAccountId(null);
      if (currentUserId) {
        await accountsStore.removeAccount(currentUserId).catch(() => undefined);
      }
    }
  };

  const clearLocalSession = async () => {
    try {
      await WebSocketService.stop();
      await VRChatService.clearSession();
    } catch {
      // Ignore errors when clearing session
    }
    userStore.clear();
    userStore.clearFriends();
    setActiveAccountId(null);
  };

  const refreshUser = async () => {
    try {
      const refreshedUser = await userStore.refresh();
      setActiveAccountId(refreshedUser.id);
    } catch {
      userStore.clear();
      userStore.clearFriends();
      setActiveAccountId(null);
    }
  };

  const setUser = (value: User | null) => {
    if (value) {
      // Set active account ID before setting user in store to ensure emit happens
      setActiveAccountId(value.id);
      userStore.set(value, { scopeId: value.id });
    } else {
      userStore.clear();
      userStore.clearFriends();
      setActiveAccountId(null);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        twoFactorMethods,
        login,
        verify2FA,
        logout,
        clearLocalSession,
        setUser,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
