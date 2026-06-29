import type {
  EntityMeta,
  FieldSource,
  RepoStats,
  StoredEntity,
} from "../../../shared/types/repository";
import type { StorageBackend } from "./backend";
import { type FieldPolicy, sourcePriority } from "./fieldPolicy";

export type RepoChange<T> = { type: "upsert"; id: string; entity: T };
type Listener<T> = (change: RepoChange<T>) => void;

const EVICT_INTERVAL_MS = 60_000;

interface Entity {
  id: string;
}

export interface RepositoryOptions<T extends Entity> {
  name: string;
  policy: FieldPolicy<T>;
  backend: StorageBackend<T>;
  maxEntries?: number;
  maxUnreadMs?: number;
  staleLiveOnLoad?: boolean;
}

export class Repository<T extends Entity> {
  private readonly map: Map<string, StoredEntity<T>>;
  private readonly listeners = new Set<Listener<T>>();
  private readonly policy: FieldPolicy<T>;
  private readonly backend: StorageBackend<T>;
  private readonly name: string;
  private readonly maxEntries: number;
  private readonly maxUnreadMs: number;
  private pendingWrites = 0;
  private saveTimer: NodeJS.Timeout | null = null;
  private lastEvict = Date.now();

  constructor(opts: RepositoryOptions<T>) {
    this.name = opts.name;
    this.policy = opts.policy;
    this.backend = opts.backend;
    this.maxEntries = opts.maxEntries ?? 50_000;
    this.maxUnreadMs = opts.maxUnreadMs ?? 90 * 24 * 60 * 60_000;
    this.map = this.backend.load();
    if (opts.staleLiveOnLoad) this.markLiveStaleOnLoad();
  }

  onChange(fn: Listener<T>): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  peek(id: string): T | undefined {
    return this.map.get(id)?.data;
  }

  get(id: string): T | undefined {
    const e = this.map.get(id);
    if (!e) return undefined;
    e.meta.lastRead = Date.now();
    return e.data;
  }

  has(id: string): boolean {
    return this.map.has(id);
  }

  all(): T[] {
    return [...this.map.values()].map((e) => e.data);
  }

  filter(pred: (data: T) => boolean): T[] {
    const out: T[] = [];
    for (const e of this.map.values()) if (pred(e.data)) out.push(e.data);
    return out;
  }

  getMany(ids: string[]): T[] {
    const now = Date.now();
    const out: T[] = [];
    for (const id of ids) {
      const e = this.map.get(id);
      if (e) {
        e.meta.lastRead = now;
        out.push(e.data);
      }
    }
    return out;
  }

  entries(): StoredEntity<T>[] {
    return [...this.map.values()];
  }

  clear(): void {
    this.map.clear();
    if (this.saveTimer) {
      clearTimeout(this.saveTimer);
      this.saveTimer = null;
    }
    this.pendingWrites = 0;
    this.backend.clear();
  }

  isStale(id: string, field: keyof T & string, now = Date.now()): boolean {
    const e = this.map.get(id);
    if (!e) return true;
    const meta = e.meta.fields[field];
    if (!meta) return true;
    const cls = this.policy.classOf(field);
    return now - meta.at > this.policy.maxAge[cls];
  }

  upsert(partial: Partial<T> & Entity, src: FieldSource, at = Date.now()): T {
    const existing = this.map.get(partial.id);
    const base: StoredEntity<T> = existing ?? {
      data: { ...(partial as T) },
      meta: { fields: {}, firstSeen: at, lastRead: at, lastFetch: at },
    };

    const data = { ...base.data } as T;
    const fields = { ...base.meta.fields };
    let changed = !existing;

    for (const key of Object.keys(partial) as (keyof T & string)[]) {
      if (key === "id") continue;
      const incoming = (partial as T)[key];
      if (incoming === undefined) continue;

      const prev = fields[key];
      const cls = this.policy.classOf(key);
      if (prev) {
        // a stripped "???" list entry shouldn't wipe an identity field we already resolved
        if (cls === "identity" && isEmpty(incoming) && !isEmpty(data[key])) continue;
        if (
          this.policy.keepNonEmpty?.has(key) &&
          isEmpty(incoming) &&
          !isEmpty(data[key]) &&
          sourcePriority(src) < sourcePriority("rest:detail")
        ) {
          continue;
        }
        if (cls === "live") {
          if (sourcePriority(src) < sourcePriority(prev.src)) continue;
          if (at < prev.at) continue;
        } else if (at < prev.at) {
          continue;
        }
      }

      data[key] = incoming;
      fields[key] = { at, src };
      changed = true;
    }

    const entity: StoredEntity<T> = {
      data,
      meta: {
        fields,
        firstSeen: base.meta.firstSeen,
        lastRead: base.meta.lastRead,
        lastFetch: src === "ws" ? base.meta.lastFetch : at,
      },
    };
    this.map.set(entity.data.id, entity);

    if (changed) {
      this.backend.put(entity.data.id, entity);
      this.scheduleSave();
      this.maybeEvict();
      this.emit({ type: "upsert", id: entity.data.id, entity: entity.data });
    }
    return entity.data;
  }

  upsertMany(items: (Partial<T> & Entity)[], src: FieldSource, at = Date.now()): void {
    for (const item of items) this.upsert(item, src, at);
  }

  remove(id: string): void {
    if (this.map.delete(id)) {
      this.backend.remove(id);
      this.scheduleSave();
    }
  }

  stats(): RepoStats {
    let totalSize = 0;
    let oldestRead: number | null = null;
    let newestFetch: number | null = null;
    for (const e of this.map.values()) {
      totalSize += roughSize(e.data);
      if (oldestRead === null || e.meta.lastRead < oldestRead) oldestRead = e.meta.lastRead;
      if (newestFetch === null || e.meta.lastFetch > newestFetch) newestFetch = e.meta.lastFetch;
    }
    return {
      name: this.name,
      count: this.map.size,
      totalSize,
      oldestRead,
      newestFetch,
      pendingWrites: this.pendingWrites,
      backendFile: this.backend.file,
    };
  }

  flush(): void {
    if (this.saveTimer) {
      clearTimeout(this.saveTimer);
      this.saveTimer = null;
    }
    this.backend.flush(this.map);
    this.pendingWrites = 0;
  }

  private markLiveStaleOnLoad(): void {
    const stale = 0;
    for (const e of this.map.values()) {
      for (const key of Object.keys(e.meta.fields)) {
        if (this.policy.classOf(key as keyof T & string) === "live") {
          e.meta.fields[key].at = stale;
          e.meta.fields[key].src = "seed";
        }
      }
    }
  }

  private maybeEvict(): void {
    const overCap = this.map.size > this.maxEntries;
    const due = Date.now() - this.lastEvict > EVICT_INTERVAL_MS;
    if (!overCap && !due) return;
    this.evict();
  }

  private recency(e: StoredEntity<T>): number {
    return Math.max(e.meta.lastRead, e.meta.lastFetch);
  }

  private evict(): void {
    this.lastEvict = Date.now();
    const now = this.lastEvict;
    if (this.maxUnreadMs > 0) {
      for (const [id, e] of this.map) {
        if (now - this.recency(e) > this.maxUnreadMs) {
          this.map.delete(id);
          this.backend.remove(id);
        }
      }
    }
    if (this.map.size <= this.maxEntries) return;
    const byRecency = [...this.map.entries()].sort(
      (a, b) => this.recency(a[1]) - this.recency(b[1]),
    );
    for (let i = 0; i < byRecency.length && this.map.size > this.maxEntries; i++) {
      const id = byRecency[i][0];
      this.map.delete(id);
      this.backend.remove(id);
    }
  }

  private scheduleSave(): void {
    this.pendingWrites++;
    if (this.saveTimer) return;
    this.saveTimer = setTimeout(() => {
      this.saveTimer = null;
      this.backend.flush(this.map);
      this.pendingWrites = 0;
    }, 1000);
    this.saveTimer.unref?.();
  }

  private emit(change: RepoChange<T>): void {
    for (const fn of this.listeners) fn(change);
  }
}

function isEmpty(v: unknown): boolean {
  return v == null || v === "" || (Array.isArray(v) && v.length === 0);
}

function roughSize(v: unknown): number {
  try {
    return JSON.stringify(v).length;
  } catch {
    return 0;
  }
}

export type { EntityMeta };
