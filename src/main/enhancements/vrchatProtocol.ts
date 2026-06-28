import { app } from "electron";
import { homedir } from "node:os";
import { join, resolve } from "node:path";
import { exec } from "node:child_process";
import { promisify } from "node:util";
import { existsSync, mkdirSync, rmSync } from "node:fs";
import { writeFileAtomicSync } from "../lib/atomicFile";
import type { EnhancementDetail } from "../../shared/types/enhancements";

const sh = promisify(exec);
const SCHEME = "vrchat";

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
  if (process.platform !== "linux") {
    app.setAsDefaultProtocolClient(SCHEME);
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
  if (process.platform !== "linux") {
    app.removeAsDefaultProtocolClient(SCHEME);
    return status();
  }
  rmSync(DESKTOP_FILE, { force: true });
  await sh(`update-desktop-database "${DESKTOP_DIR}"`).catch(() => {});
  return status();
}
