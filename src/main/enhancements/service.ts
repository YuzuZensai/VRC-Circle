import { app } from "electron";
import { join } from "node:path";
import { readFileSync } from "node:fs";
import { writeFileAtomicSync } from "../lib/atomicFile";
import { logger } from "../debug/logger";
import type {
  EnhancementId,
  EnhancementState,
  EnhancementsSnapshot,
  OsPlatform,
} from "../../shared/types/enhancements";
import * as screenshot from "./screenshotSymlink";

const platform = () => process.platform as OsPlatform;
const storePath = () => join(app.getPath("userData"), "enhancements.json");

type Prefs = Partial<Record<EnhancementId, boolean>>;

function readPrefs(): Prefs {
  try {
    return JSON.parse(readFileSync(storePath(), "utf8")) as Prefs;
  } catch {
    return {};
  }
}

function writePrefs(prefs: Prefs): void {
  writeFileAtomicSync(storePath(), JSON.stringify(prefs, null, 2));
}

function screenshotState(): EnhancementState {
  const s = screenshot.status();
  return {
    id: "linux-screenshot-symlink",
    enabled: s.active,
    detail: s.detail,
    resolvedPath: s.source ?? undefined,
  };
}

export function snapshot(): EnhancementsSnapshot {
  return { platform: platform(), states: [screenshotState()] };
}

export function setEnabled(id: EnhancementId, enabled: boolean): EnhancementsSnapshot {
  if (id === "linux-screenshot-symlink") {
    if (platform() !== "linux") throw new Error("This enhancement only applies to Linux.");
    const status = enabled ? screenshot.enable() : screenshot.disable();
    const prefs = readPrefs();
    prefs[id] = enabled;
    writePrefs(prefs);
    logger.info("enhancements", `screenshot symlink ${enabled ? "enabled" : "disabled"}`, status);
  }
  return snapshot();
}

export function reconcile(): void {
  if (platform() !== "linux") return;
  const prefs = readPrefs();
  if (!prefs["linux-screenshot-symlink"]) return;
  try {
    if (!screenshot.status().active) {
      screenshot.enable();
      logger.info("enhancements", "re-applied screenshot symlink on startup");
    }
  } catch (err) {
    logger.warn("enhancements", "could not re-apply screenshot symlink", err);
  }
}
