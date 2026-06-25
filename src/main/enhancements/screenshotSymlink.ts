import { homedir } from "node:os";
import { join } from "node:path";
import {
  existsSync,
  lstatSync,
  mkdirSync,
  readdirSync,
  readlinkSync,
  renameSync,
  rmSync,
  symlinkSync,
} from "node:fs";
import { vrchatPrefix } from "../game/steam";
import type { EnhancementDetail } from "../../shared/types/enhancements";

const PREFIX_TAIL = join("pfx", "drive_c", "users", "steamuser", "Pictures", "VRChat");

export const screenshotTarget = () => join(homedir(), "Pictures", "VRChat");

export function detectProtonScreenshots(): string | null {
  const prefix = vrchatPrefix();
  return prefix ? join(prefix, PREFIX_TAIL) : null;
}

function isSymlinkTo(path: string, target: string): boolean {
  try {
    return lstatSync(path).isSymbolicLink() && readlinkSync(path) === target;
  } catch {
    return false;
  }
}

export interface SymlinkStatus {
  source: string | null;
  active: boolean;
  detail: EnhancementDetail;
}

export function status(): SymlinkStatus {
  const source = detectProtonScreenshots();
  if (!source) return { source: null, active: false, detail: { key: "noPrefix" } };
  const target = screenshotTarget();
  return isSymlinkTo(source, target)
    ? { source, active: true, detail: { key: "linked", path: target } }
    : { source, active: false, detail: { key: "protonFolder", path: source } };
}

function mergeInto(from: string, to: string): void {
  mkdirSync(to, { recursive: true });
  for (const name of readdirSync(from)) {
    const src = join(from, name);
    const dest = join(to, name);

    if (lstatSync(src).isDirectory()) {
      if (existsSync(dest) && lstatSync(dest).isDirectory()) {
        mergeInto(src, dest);
      } else if (existsSync(dest)) {
        renameSync(src, freeName(to, name));
      } else {
        renameSync(src, dest);
      }
      continue;
    }

    renameSync(src, existsSync(dest) ? freeName(to, name) : dest);
  }
}

function freeName(dir: string, name: string): string {
  const dot = name.lastIndexOf(".");
  const base = dot > 0 ? name.slice(0, dot) : name;
  const ext = dot > 0 ? name.slice(dot) : "";
  let n = 1;
  let dest: string;
  do {
    dest = join(dir, `${base} (${n})${ext}`);
    n++;
  } while (existsSync(dest));
  return dest;
}

export function enable(): SymlinkStatus {
  const source = detectProtonScreenshots();
  if (!source) throw new Error("No VRChat Proton prefix found. Launch VRChat once, then retry.");

  const target = screenshotTarget();
  mkdirSync(target, { recursive: true });
  if (isSymlinkTo(source, target)) return status();

  if (existsSync(source)) {
    const st = lstatSync(source);
    if (st.isSymbolicLink()) {
      rmSync(source, { force: true });
    } else if (st.isDirectory()) {
      mergeInto(source, target);
      rmSync(source, { recursive: true, force: true });
    } else {
      throw new Error(`${source} exists and isn't a folder; refusing to replace it.`);
    }
  }

  symlinkSync(target, source, "dir");
  return status();
}

export function disable(): SymlinkStatus {
  const source = detectProtonScreenshots();
  if (source && existsSync(source) && lstatSync(source).isSymbolicLink()) {
    rmSync(source, { force: true });
  }
  return status();
}
