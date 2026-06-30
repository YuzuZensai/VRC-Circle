import { app } from "electron";
import { join } from "node:path";
import { existsSync } from "node:fs";
import { jsonFile } from "../lib/jsonFile";
import type { AppConfig, AppPreferences, PreferredRegion } from "../../shared/types/appConfig";
import { DEFAULT_LOCALE, isAppLocale } from "../../shared/locales";
import { detectedGamePath } from "../game/steam";

const path = () => join(app.getPath("userData"), "app-config.json");

type StoredConfig = Omit<AppConfig, "version" | "detectedGamePath">;
const DEFAULT_PREFERENCES: AppPreferences = {
  schemeMode: "auto",
  accent: null,
  locale: DEFAULT_LOCALE,
  showDebugNav: false,
  demoMode: false,
};
const DEFAULTS: StoredConfig = {
  gamePath: null,
  preferredRegion: "auto",
  preferences: DEFAULT_PREFERENCES,
};

function normalizePreferences(raw: Partial<AppPreferences> | undefined): AppPreferences {
  const schemeMode = raw?.schemeMode;
  const locale = raw?.locale;
  const accent = raw?.accent?.trim() || null;
  return {
    schemeMode: schemeMode === "light" || schemeMode === "dark" || schemeMode === "auto" ? schemeMode : "auto",
    accent: accent && /^#[\da-f]{6}$/i.test(accent) ? accent : null,
    locale: isAppLocale(locale) ? locale : DEFAULT_LOCALE,
    showDebugNav: raw?.showDebugNav === true,
    demoMode: raw?.demoMode === true,
  };
}

const configFile = jsonFile<StoredConfig>(
  path,
  () => ({ ...DEFAULTS }),
  (raw) => {
    const stored = raw as Partial<StoredConfig>;
    return {
      ...DEFAULTS,
      ...stored,
      preferences: normalizePreferences(stored.preferences),
    };
  },
);
const readStored = configFile.read;

function writeStored(next: StoredConfig): void {
  configFile.write(next);
}

function withDerived(stored: StoredConfig): AppConfig {
  return { version: app.getVersion(), detectedGamePath: detectedGamePath(), ...stored };
}

export function gamePathOverride(): string | null {
  return readStored().gamePath;
}

export function preferredRegion(): PreferredRegion {
  return readStored().preferredRegion;
}

export function setPreferredRegion(region: PreferredRegion): AppConfig {
  const next: StoredConfig = { ...readStored(), preferredRegion: region };
  writeStored(next);
  return withDerived(next);
}

export function setPreferences(patch: Partial<AppPreferences>): AppConfig {
  const stored = readStored();
  const next: StoredConfig = {
    ...stored,
    preferences: normalizePreferences({ ...stored.preferences, ...patch }),
  };
  writeStored(next);
  return withDerived(next);
}

export function getConfig(): AppConfig {
  return withDerived(readStored());
}

export function setGamePath(gamePath: string | null): AppConfig {
  const trimmed = gamePath?.trim() || null;
  if (trimmed && !existsSync(trimmed)) {
    throw new Error("That path doesn't exist on disk.");
  }
  const next: StoredConfig = { ...readStored(), gamePath: trimmed };
  writeStored(next);
  return withDerived(next);
}
