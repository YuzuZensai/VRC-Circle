import type { InstanceRegion } from "./instance";
import type { AppLocale } from "../locales";

export type PreferredRegion = InstanceRegion | "auto";
export type AppSchemeMode = "light" | "dark" | "auto";

export interface AppPreferences {
  schemeMode: AppSchemeMode;
  accent: string | null;
  locale: AppLocale;
  showDebugNav: boolean;
  demoMode: boolean;
}

export interface AppConfig {
  version: string;
  gamePath: string | null;
  detectedGamePath: string | null;
  preferredRegion: PreferredRegion;
  preferences: AppPreferences;
}

export interface RegionPing {
  region: InstanceRegion;
  ms: number | null;
}
