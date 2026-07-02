import type { MoveResult } from "../../shared/types/favorites";
import { isTransientError } from "./errors";

export interface FavoriteMover<Rec> {
  skip: (rec: Rec | undefined, folder: string) => boolean;
  canRefavorite: (id: string) => Promise<boolean>;
  remove: (rec: Rec) => Promise<void>;
  add: (id: string, folder: string) => Promise<void>;
  restore: (rec: Rec) => Promise<void>;
  reload: () => Promise<void>;
  onMoved?: (id: string, folder: string) => void;
}

const BULK_PACE_MS = 350;

export function pause(ms = BULK_PACE_MS): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

export async function moveOneFavorite<Rec>(
  m: FavoriteMover<Rec>,
  rec: Rec | undefined,
  id: string,
  folder: string,
  reload: boolean,
): Promise<MoveResult> {
  if (m.skip(rec, folder)) return { moved: 0, skipped: [] };
  if (!(await m.canRefavorite(id))) return { moved: 0, skipped: [id] };
  if (rec) await m.remove(rec);
  try {
    await m.add(id, folder);
  } catch (err) {
    if (rec) await m.restore(rec);
    if (reload) await m.reload();
    if (isTransientError(err)) throw err;
    return { moved: 0, skipped: [id] };
  }
  if (reload) await m.reload();
  m.onMoved?.(id, folder);
  return { moved: 1, skipped: [] };
}

export async function moveManyFavorites<Rec>(
  m: FavoriteMover<Rec>,
  records: Map<string, Rec>,
  ids: string[],
  folder: string,
): Promise<MoveResult> {
  const skipped: string[] = [];
  let moved = 0;
  let first = true;
  for (const id of ids) {
    const rec = records.get(id);
    if (m.skip(rec, folder)) continue;
    if (!first) await pause();
    first = false;
    if (!(await m.canRefavorite(id))) {
      skipped.push(id);
      continue;
    }
    if (rec) await m.remove(rec);
    try {
      await m.add(id, folder);
    } catch (err) {
      if (rec) await m.restore(rec);
      if (isTransientError(err)) {
        await m.reload();
        throw err;
      }
      skipped.push(id);
      continue;
    }
    m.onMoved?.(id, folder);
    moved++;
  }
  await m.reload();
  return { moved, skipped };
}
