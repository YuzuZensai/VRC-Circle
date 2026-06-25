import { app } from "electron";
import { join } from "node:path";
import { existsSync, readFileSync } from "node:fs";
import { writeFileAtomicSync } from "../lib/atomicFile";
import type { AppConfig } from "../../shared/types/appConfig";

const path = () => join(app.getPath("userData"), "app-config.json");

type StoredConfig = Omit<AppConfig, "version">;
const DEFAULTS: StoredConfig = { gamePath: null };

function readStored(): StoredConfig {
  try {
    return { ...DEFAULTS, ...(JSON.parse(readFileSync(path(), "utf8")) as Partial<StoredConfig>) };
  } catch {
    return { ...DEFAULTS };
  }
}

export function getConfig(): AppConfig {
  return { version: app.getVersion(), ...readStored() };
}

export function setGamePath(gamePath: string | null): AppConfig {
  const trimmed = gamePath?.trim() || null;
  if (trimmed && !existsSync(trimmed)) {
    throw new Error("That path doesn't exist on disk.");
  }
  const next: StoredConfig = { ...readStored(), gamePath: trimmed };
  writeFileAtomicSync(path(), JSON.stringify(next, null, 2));
  return { version: app.getVersion(), ...next };
}
