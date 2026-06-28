import { app } from "electron";
import { join } from "node:path";
import { existsSync, readFileSync } from "node:fs";
import { writeFileAtomicSync } from "../lib/atomicFile";
import type { AppConfig, PreferredRegion } from "../../shared/types/appConfig";
import { detectedGamePath } from "../game/steam";

const path = () => join(app.getPath("userData"), "app-config.json");

type StoredConfig = Omit<AppConfig, "version" | "detectedGamePath">;
const DEFAULTS: StoredConfig = { gamePath: null, preferredRegion: "auto" };

function readStored(): StoredConfig {
  try {
    return { ...DEFAULTS, ...(JSON.parse(readFileSync(path(), "utf8")) as Partial<StoredConfig>) };
  } catch {
    return { ...DEFAULTS };
  }
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
  writeFileAtomicSync(path(), JSON.stringify(next, null, 2));
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
  writeFileAtomicSync(path(), JSON.stringify(next, null, 2));
  return withDerived(next);
}
