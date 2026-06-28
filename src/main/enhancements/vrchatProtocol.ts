import { app } from "electron";
import { homedir } from "node:os";
import { join, resolve } from "node:path";
import { exec } from "node:child_process";
import { promisify } from "node:util";
import { existsSync, mkdirSync, rmSync } from "node:fs";
import { writeFileAtomicSync } from "../lib/atomicFile";
import { logger } from "../debug/logger";
import type { EnhancementDetail } from "../../shared/types/enhancements";

const sh = promisify(exec);
const SCHEME = "vrchat";

// macOS keys the scheme off the bundled Info.plist, so dev has nothing to register or remove
const isMacDev = process.platform === "darwin" && process.defaultApp;

const DESKTOP_DIR = join(homedir(), ".local", "share", "applications");
const DESKTOP_FILE = join(DESKTOP_DIR, "vrc-circle-vrchat-url.desktop");
const DESKTOP_NAME = "vrc-circle-vrchat-url.desktop";

export interface ProtocolStatus {
  registered: boolean;
  detail: EnhancementDetail;
}

function execPath(): string {
  // dev's argv[1] is relative; the DE launches from a different cwd so resolve it
  const exe = `"${process.execPath}"`;
  if (process.defaultApp && process.argv[1]) return `${exe} "${resolve(process.argv[1])}"`;
  return exe;
}

export function status(): ProtocolStatus {
  if (isMacDev) return { registered: false, detail: { key: "notRegistered" } };
  if (process.platform !== "linux") {
    const registered = app.isDefaultProtocolClient(SCHEME);
    return {
      registered,
      detail: { key: registered ? "registered" : "notRegistered" },
    };
  }
  return {
    registered: existsSync(DESKTOP_FILE),
    detail: existsSync(DESKTOP_FILE) ? { key: "registered" } : { key: "notRegistered" },
  };
}

export async function enable(): Promise<ProtocolStatus> {
  if (isMacDev) {
    logger.info(
      "enhancements",
      "vrchat protocol registration skipped; macOS dev needs a packaged build",
    );
    return status();
  }
  if (process.platform !== "linux") {
    // in dev the bare electron binary has no project context, so pass the entry script
    if (process.defaultApp && process.argv[1]) {
      app.setAsDefaultProtocolClient(SCHEME, process.execPath, [resolve(process.argv[1])]);
    } else {
      app.setAsDefaultProtocolClient(SCHEME);
    }
    return status();
  }

  mkdirSync(DESKTOP_DIR, { recursive: true });
  const desktop = [
    "[Desktop Entry]",
    "Type=Application",
    "Name=VRC Circle (VRChat link handler)",
    `Exec=${execPath()} %u`,
    "Terminal=false",
    "NoDisplay=true",
    `MimeType=x-scheme-handler/${SCHEME};`,
    "",
  ].join("\n");
  writeFileAtomicSync(DESKTOP_FILE, desktop);

  await sh(`update-desktop-database "${DESKTOP_DIR}"`).catch(() => {});
  await sh(`xdg-mime default ${DESKTOP_NAME} x-scheme-handler/${SCHEME}`).catch(() => {});
  return status();
}

export async function disable(): Promise<ProtocolStatus> {
  if (isMacDev) {
    logger.info(
      "enhancements",
      "vrchat protocol removal skipped; macOS dev has nothing registered",
    );
    return status();
  }
  if (process.platform !== "linux") {
    if (process.defaultApp && process.argv[1]) {
      app.removeAsDefaultProtocolClient(SCHEME, process.execPath, [resolve(process.argv[1])]);
    } else {
      app.removeAsDefaultProtocolClient(SCHEME);
    }
    return status();
  }
  rmSync(DESKTOP_FILE, { force: true });
  await sh(`update-desktop-database "${DESKTOP_DIR}"`).catch(() => {});
  return status();
}
