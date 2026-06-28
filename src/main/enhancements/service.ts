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
import * as protocol from "./vrchatProtocol";

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

function protocolState(): EnhancementState {
  const s = protocol.status();
  return { id: "vrchat-protocol-handler", enabled: s.registered, detail: s.detail };
}

export function snapshot(): EnhancementsSnapshot {
  return { platform: platform(), states: [screenshotState(), protocolState()] };
}

export async function setEnabled(
  id: EnhancementId,
  enabled: boolean,
): Promise<EnhancementsSnapshot> {
  if (id === "linux-screenshot-symlink") {
    if (platform() !== "linux") throw new Error("This enhancement only applies to Linux.");
    const status = enabled ? screenshot.enable() : screenshot.disable();
    logger.info("enhancements", `screenshot symlink ${enabled ? "enabled" : "disabled"}`, status);
  } else if (id === "vrchat-protocol-handler") {
    const status = enabled ? await protocol.enable() : await protocol.disable();
    logger.info("enhancements", `vrchat protocol ${enabled ? "registered" : "removed"}`, status);
  }
  const prefs = readPrefs();
  prefs[id] = enabled;
  writePrefs(prefs);
  return snapshot();
}

export async function reconcile(): Promise<void> {
  const prefs = readPrefs();

  if (platform() === "linux" && prefs["linux-screenshot-symlink"]) {
    try {
      if (!screenshot.status().active) {
        screenshot.enable();
        logger.info("enhancements", "re-applied screenshot symlink on startup");
      }
    } catch (err) {
      logger.warn("enhancements", "could not re-apply screenshot symlink", err);
    }
  }

  if (prefs["vrchat-protocol-handler"]) {
    try {
      if (!protocol.status().registered) {
        await protocol.enable();
        logger.info("enhancements", "re-registered vrchat protocol on startup");
      }
    } catch (err) {
      logger.warn("enhancements", "could not re-register vrchat protocol", err);
    }
  }
}
