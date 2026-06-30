import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { AppConfig, AppPreferences, PreferredRegion } from "../../../shared/types/appConfig";
import { api } from "./api";

interface AppConfigContextValue {
  config: AppConfig | null;
  setGamePath: (gamePath: string | null) => Promise<AppConfig>;
  pickGamePath: () => Promise<AppConfig>;
  setPreferredRegion: (region: PreferredRegion) => Promise<AppConfig>;
  setPreferences: (patch: Partial<AppPreferences>) => Promise<AppConfig>;
}

const AppConfigContext = createContext<AppConfigContextValue | null>(null);

export function AppConfigProvider({ children }: { children: ReactNode }) {
  const [config, setConfig] = useState<AppConfig | null>(null);

  useEffect(() => {
    let cancelled = false;
    void api.config.get().then((next) => {
      if (!cancelled) setConfig(next);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const commit = useCallback(async (next: Promise<AppConfig>) => {
    const config = await next;
    setConfig(config);
    return config;
  }, []);

  const value = useMemo<AppConfigContextValue>(
    () => ({
      config,
      setGamePath: (gamePath) => commit(api.config.setGamePath(gamePath)),
      pickGamePath: () => commit(api.config.pickGamePath()),
      setPreferredRegion: (region) => commit(api.config.setPreferredRegion(region)),
      setPreferences: (patch) => commit(api.config.setPreferences(patch)),
    }),
    [config, commit],
  );

  return <AppConfigContext.Provider value={value}>{children}</AppConfigContext.Provider>;
}

export function useAppConfig(): AppConfigContextValue {
  const ctx = useContext(AppConfigContext);
  if (!ctx) throw new Error("useAppConfig must be used within <AppConfigProvider>");
  return ctx;
}
