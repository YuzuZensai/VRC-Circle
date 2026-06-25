import { join, basename, relative, dirname, sep } from "node:path";
import { readdir, stat } from "node:fs/promises";
import { shell } from "electron";
import { galleryRoots } from "./paths";
import { photoUrl, thumbUrl } from "./protocol";
import { readPngMetadata } from "./metadata";
import { logger } from "../debug/logger";
import type { GallerySnapshot, Photo } from "../../shared/types/gallery";

const IMAGE_EXT = /\.(png|jpe?g)$/i;

type CacheEntry = { key: string; photo: Photo };
const photoCache = new Map<string, CacheEntry>();

async function walk(dir: string, out: string[]): Promise<void> {
  let entries: import("node:fs").Dirent[];
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const e of entries) {
    const full = join(dir, e.name);
    if (e.isDirectory()) {
      await walk(full, out);
    } else if (e.isFile() && IMAGE_EXT.test(e.name)) {
      out.push(full);
    }
  }
}

function bucketOf(root: string, path: string): string {
  const rel = relative(root, path);
  const head = rel.split(sep)[0];
  return head && head !== basename(path) ? head : basename(dirname(path));
}

async function toPhoto(root: string, path: string): Promise<Photo | null> {
  let st: import("node:fs").Stats;
  try {
    st = await stat(path);
  } catch {
    return null;
  }
  const key = `${path}:${st.mtimeMs}:${st.size}`;
  const cached = photoCache.get(path);
  if (cached && cached.key === key) return cached.photo;

  const metadata = /\.png$/i.test(path) ? await readPngMetadata(path) : {};
  const photo: Photo = {
    id: path,
    fileName: basename(path),
    bucket: bucketOf(root, path),
    src: photoUrl(path),
    thumb: thumbUrl(path),
    sizeBytes: st.size,
    modifiedAt: new Date(st.mtimeMs).toISOString(),
    metadata,
  };
  photoCache.set(path, { key, photo });
  return photo;
}

export async function photoAt(path: string): Promise<Photo | null> {
  const root = galleryRoots().find((r) => path === r || path.startsWith(r + sep)) ?? dirname(path);
  return toPhoto(root, path);
}

export async function snapshot(): Promise<GallerySnapshot> {
  const roots = galleryRoots();
  if (roots.length === 0) return { roots: [], empty: true, photos: [] };

  const files: { root: string; path: string }[] = [];
  for (const root of roots) {
    const found: string[] = [];
    await walk(root, found);
    for (const path of found) files.push({ root, path });
  }

  const photos = (await Promise.all(files.map(({ root, path }) => toPhoto(root, path)))).filter(
    (p): p is Photo => p !== null,
  );

  photos.sort((a, b) => sortKey(b).localeCompare(sortKey(a)));

  logger.info("gallery", `scanned ${photos.length} photos across ${roots.length} root(s)`);
  return { roots, empty: false, photos };
}

function sortKey(p: Photo): string {
  return p.metadata.takenAt ?? p.modifiedAt;
}

export async function remove(paths: string[]): Promise<void> {
  const results = await Promise.allSettled(
    paths.map(async (path) => {
      await shell.trashItem(path);
      photoCache.delete(path);
    }),
  );
  const failed = results.filter((r) => r.status === "rejected").length;
  if (failed > 0) throw new Error(`Couldn't delete ${failed} of ${paths.length} photo(s).`);
}
