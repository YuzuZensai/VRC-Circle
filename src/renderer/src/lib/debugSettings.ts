import { useCallback } from "react";
import { useAppConfig } from "./AppConfigContext";

export function useDebugNavVisible(): boolean {
  return useAppConfig().config?.preferences.showDebugNav ?? false;
}

export function useDemoMode(): boolean {
  return useAppConfig().config?.preferences.demoMode ?? false;
}

export function useSetDebugNavVisible(): (visible: boolean) => void {
  const { setPreferences } = useAppConfig();
  return useCallback(
    (visible: boolean) => {
      void setPreferences({ showDebugNav: visible });
    },
    [setPreferences],
  );
}

export function useSetDemoMode(): (enabled: boolean) => void {
  const { setPreferences } = useAppConfig();
  return useCallback(
    (enabled: boolean) => {
      void setPreferences({ demoMode: enabled });
    },
    [setPreferences],
  );
}
