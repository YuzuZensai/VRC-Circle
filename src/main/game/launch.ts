import { shell } from "electron";
import { exec } from "node:child_process";
import { promisify } from "node:util";
import { VRCHAT_APPID } from "./steam";
import type { GameStatus } from "../../shared/types/game";
import { broadcast } from "../windows";

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
