import { watch, type FSWatcher } from "node:fs";
import { readdir, stat } from "node:fs/promises";
import { join } from "node:path";
import { galleryRoots } from "./paths";
import { photoAt } from "./service";
import { broadcast } from "../windows";
import { logger } from "../debug/logger";

const IMAGE_EXT = /\.(png|jpe?g)$/i;

const watchers = new Map<string, FSWatcher>();
const pending = new Set<string>();
const emitted = new Set<string>();

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

// VRChat writes screenshots in chunks
async function settle(path: string): Promise<boolean> {
  let last = -1;
  for (let i = 0; i < 40; i++) {
    let s;
    try {
      s = await stat(path);
    } catch {
      return false;
    }
    if (!s.isFile()) return false;
    if (s.size > 0 && s.size === last) return true;
    last = s.size;
    await delay(150);
  }
  return true;
}

async function onCandidate(path: string): Promise<void> {
  if (!IMAGE_EXT.test(path) || pending.has(path) || emitted.has(path)) return;
  pending.add(path);
  const ok = await settle(path);
  pending.delete(path);
  if (!ok) return;
  emitted.add(path);
  const photo = await photoAt(path);
  if (photo) {
    broadcast("gallery:added", photo);
    logger.info("gallery", `new photo ${photo.fileName}`);
  }
}

async function handleEntry(full: string): Promise<void> {
  let s;
  try {
    s = await stat(full);
  } catch {
    return;
  }
  if (s.isDirectory()) watchDir(full);
  else if (s.isFile()) void onCandidate(full);
}

function watchDir(dir: string): void {
  if (watchers.has(dir)) return;
  let w: FSWatcher;
  try {
    w = watch(dir, (_event, filename) => {
      if (filename) void handleEntry(join(dir, filename.toString()));
    });
  } catch {
    return;
  }
  w.on("error", () => {
    w.close();
    watchers.delete(dir);
  });
  watchers.set(dir, w);
}

export function startGalleryWatch(): void {
  const roots = galleryRoots();
  for (const root of roots) {
    watchDir(root);
    readdir(root, { withFileTypes: true })
      .then((entries) => {
        for (const e of entries) if (e.isDirectory()) watchDir(join(root, e.name));
      })
      .catch(() => {});
  }
  logger.info("gallery", `watching ${roots.length} root(s) for new photos`);
}

export function stopGalleryWatch(): void {
  for (const w of watchers.values()) w.close();
  watchers.clear();
  pending.clear();
  emitted.clear();
}
