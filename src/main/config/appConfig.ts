import { app } from "electron";
import { join } from "node:path";
import { existsSync } from "node:fs";
import { jsonFile } from "../lib/jsonFile";
import type { AppConfig, PreferredRegion } from "../../shared/types/appConfig";
import { detectedGamePath } from "../game/steam";

const path = () => join(app.getPath("userData"), "app-config.json");

type StoredConfig = Omit<AppConfig, "version" | "detectedGamePath">;
const DEFAULTS: StoredConfig = { gamePath: null, preferredRegion: "auto" };

const configFile = jsonFile<StoredConfig>(
  path,
  () => ({ ...DEFAULTS }),
  (raw) => ({ ...DEFAULTS, ...(raw as Partial<StoredConfig>) }),
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
