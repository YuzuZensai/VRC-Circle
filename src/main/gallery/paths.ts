import { homedir } from "node:os";
import { join } from "node:path";
import { existsSync, lstatSync, realpathSync } from "node:fs";
import { detectProtonScreenshots } from "../enhancements/screenshotSymlink";

function picturesVRChat(): string {
  return join(homedir(), "Pictures", "VRChat");
}

function isRealDir(path: string): boolean {
  try {
    return lstatSync(path).isDirectory();
  } catch {
    return false;
  }
}

export function galleryRoots(): string[] {
  const candidates = [picturesVRChat()];
  const proton = detectProtonScreenshots();
  if (proton) candidates.push(proton);

  const seen = new Set<string>();
  const roots: string[] = [];
  for (const path of candidates) {
    if (!existsSync(path) || !isRealDir(path)) continue;
    let real = path;
    try {
      real = realpathSync(path);
    } catch {}
    if (seen.has(real)) continue;
    seen.add(real);
    roots.push(path);
  }
  return roots;
}
