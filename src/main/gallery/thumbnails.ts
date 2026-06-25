import { app } from "electron";
import sharp from "sharp";
import { join } from "node:path";
import { createHash } from "node:crypto";
import { mkdirSync } from "node:fs";
import { readFile, writeFile, stat, readdir, rm } from "node:fs/promises";
import { logger } from "../debug/logger";
import type { ThumbCacheStats } from "../../shared/types/gallery";

const THUMB_EDGE = 480;
const THUMB_QUALITY = 72;

sharp.concurrency(2);

let dirReady = false;
function thumbDir(): string {
  const dir = join(app.getPath("userData"), "thumbnails");
  if (!dirReady) {
    mkdirSync(dir, { recursive: true });
    dirReady = true;
  }
  return dir;
}

function cachePath(srcPath: string, mtimeMs: number, size: number): string {
  const hash = createHash("sha1").update(`${srcPath}:${mtimeMs}:${size}`).digest("hex");
  return join(thumbDir(), `${hash}.jpg`);
}

const pending = new Map<string, Promise<Buffer | null>>();

export async function getThumbnail(srcPath: string): Promise<Buffer | null> {
  let st: Awaited<ReturnType<typeof stat>>;
  try {
    st = await stat(srcPath);
  } catch {
    return null;
  }
  const dest = cachePath(srcPath, st.mtimeMs, st.size);

  try {
    return await readFile(dest);
  } catch {}

  const existing = pending.get(dest);
  if (existing) return existing;

  const job = build(srcPath, dest);
  pending.set(dest, job);
  try {
    return await job;
  } finally {
    pending.delete(dest);
  }
}

export async function thumbStats(): Promise<ThumbCacheStats> {
  const dir = thumbDir();
  let count = 0;
  let totalBytes = 0;
  try {
    const names = await readdir(dir);
    for (const name of names) {
      if (!name.endsWith(".jpg")) continue;
      try {
        const st = await stat(join(dir, name));
        count++;
        totalBytes += st.size;
      } catch {}
    }
  } catch {}
  return { count, totalBytes, dir };
}

export async function clearThumbnails(): Promise<ThumbCacheStats> {
  const dir = thumbDir();
  try {
    const names = await readdir(dir);
    await Promise.all(
      names
        .filter((n) => n.endsWith(".jpg"))
        .map((n) => rm(join(dir, n), { force: true }).catch(() => {})),
    );
    logger.info("gallery", `cleared ${names.length} thumbnail(s)`);
  } catch {}
  return thumbStats();
}

async function build(srcPath: string, dest: string): Promise<Buffer | null> {
  try {
    const jpeg = await sharp(srcPath, { failOn: "none", limitInputPixels: false })
      .rotate()
      .resize(THUMB_EDGE, THUMB_EDGE, { fit: "inside", withoutEnlargement: true })
      .jpeg({ quality: THUMB_QUALITY, mozjpeg: true })
      .toBuffer();
    await writeFile(dest, jpeg).catch(() => {});
    return jpeg;
  } catch (err) {
    logger.warn("gallery", "thumbnail generation failed", { srcPath, err: String(err) });
    return null;
  }
}
