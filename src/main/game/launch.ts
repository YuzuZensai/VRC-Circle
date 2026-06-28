import { shell } from "electron";
import { exec, spawn } from "node:child_process";
import { promisify } from "node:util";
import { VRCHAT_APPID, vrchatLaunchExe, vrchatProton, vrchatPrefix, steamRoot } from "./steam";
import type { GameStatus } from "../../shared/types/game";
import { broadcast } from "../windows";
import { logger } from "../debug/logger";

const sh = promisify(exec);

const SUPPORTED = process.platform !== "darwin";

async function isRunning(): Promise<boolean> {
  try {
    if (process.platform === "win32") {
      const { stdout } = await sh('tasklist /fi "imagename eq VRChat.exe" /nh');
      return /vrchat\.exe/i.test(stdout);
    }
    const { stdout } = await sh("ps -A -o args=");
    return stdout.split("\n").some((line) => /vrchat\.exe/i.test(line) && !/grep/i.test(line));
  } catch {
    return false;
  }
}

export async function status(): Promise<GameStatus> {
  if (!SUPPORTED) return { running: false, supported: false };
  return setRunning(await isRunning());
}

async function focus(): Promise<void> {
  if (process.platform !== "linux") return;
  try {
    await sh(`xdotool search --class steam_app_${VRCHAT_APPID} windowactivate %@`);
  } catch {}
}

export async function launch(): Promise<GameStatus> {
  if (!SUPPORTED) return { running: false, supported: false };
  if (await isRunning()) {
    await focus();
    return setRunning(true);
  }
  await shell.openExternal(`steam://rungameid/${VRCHAT_APPID}`);
  return { running: lastRunning, supported: true };
}

export interface JoinResult {
  launched: boolean;
  alreadyRunning: boolean;
  unsupported?: boolean;
}

export async function joinInstance(url: string): Promise<JoinResult> {
  if (!url.startsWith("vrchat://")) throw new Error("Not a vrchat:// link");
  const running = await isRunning();

  if (process.platform === "darwin") {
    return { launched: false, alreadyRunning: false, unsupported: true };
  }

  if (process.platform === "win32") {
    if (running) await focus();
    else {
      broadcast("game:changed", { running: false, supported: true, launching: true });
      await shell.openExternal(`steam://rungameid/${VRCHAT_APPID}`);
    }
    await shell.openExternal(url);
    return { launched: true, alreadyRunning: running };
  }

  if (running) {
    linuxHandoff(url);
    await focus();
    return { launched: true, alreadyRunning: true };
  }

  broadcast("game:changed", { running: false, supported: true, launching: true });
  spawn("steam", ["-applaunch", VRCHAT_APPID, url], { detached: true, stdio: "ignore" }).unref();
  logger.info("game", "cold join via steam -applaunch");
  return { launched: true, alreadyRunning: false };
}

// reaches a live VRChat through its named pipe by running launch.exe inside the
// same proton prefix; steam -applaunch is a no-op once the game is up.
function linuxHandoff(url: string): void {
  const proton = vrchatProton();
  const exe = vrchatLaunchExe();
  const prefix = vrchatPrefix();
  if (!proton || !exe || !prefix) {
    logger.warn("game", "cannot hand off url; proton/launch.exe/prefix not found", {
      proton,
      exe,
      prefix,
    });
    return;
  }
  spawn(proton, ["run", exe, url], {
    detached: true,
    stdio: "ignore",
    env: {
      ...process.env,
      STEAM_COMPAT_DATA_PATH: prefix,
      STEAM_COMPAT_CLIENT_INSTALL_PATH: steamRoot(),
    },
  }).unref();
  logger.info("game", "warm join via proton launch.exe");
}

let lastRunning = false;

function setRunning(running: boolean): GameStatus {
  if (running !== lastRunning) {
    lastRunning = running;
    broadcast("game:changed", { running, supported: true });
  }
  return { running, supported: true };
}

export function startWatcher(): void {
  if (!SUPPORTED) return;
  const tick = () => void isRunning().then(setRunning);
  tick();
  setInterval(tick, 5000);
}
