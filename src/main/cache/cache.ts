import { readFileSync } from "node:fs";
import { writeFileAtomic, writeFileAtomicSync } from "../lib/atomicFile";
import type { CacheEntryInfo, CacheStats } from "../../shared/types/debug";
import { rateLimitDelayMs } from "../lib/http";

interface Entry<T> {
  value: T;
  createdAt: number;
  expiresAt: number;
  hardExpiresAt: number;
  hits: number;
  lastAccess: number;
  size: number;
}

interface Counters {
  hits: number;
  misses: number;
  sets: number;
  patches: number;
  revalidations: number;
  invalidations: number;
  clears: number;
}

function byteSize(value: unknown): number {
  try {
    return new TextEncoder().encode(JSON.stringify(value) ?? "").length;
  } catch {
    return 0;
  }
}

export interface CachePolicy {
  ttl: number;
  staleWhileRevalidate?: number;
}

export type CacheEvent = {
  type: "set" | "patch" | "invalidate" | "clear" | "hit" | "revalidate";
  key?: string;
};

type Listener = (e: CacheEvent) => void;

export class TtlCache {
  private readonly store = new Map<string, Entry<unknown>>();
  private readonly inflight = new Map<string, Promise<unknown>>();
  private readonly listeners = new Set<Listener>();
  private file: string | null = null;
  private saveTimer: NodeJS.Timeout | null = null;
  private rateLimitedUntil = 0;

  constructor(private readonly maxEntries = 500) {}
  private readonly counters: Counters = {
    hits: 0,
    misses: 0,
    sets: 0,
    patches: 0,
    revalidations: 0,
    invalidations: 0,
    clears: 0,
  };

  persistTo(file: string): void {
    this.file = file;
    try {
      const raw = JSON.parse(readFileSync(file, "utf8")) as Record<string, Partial<Entry<unknown>>>;
      for (const [k, v] of Object.entries(raw)) {
        if (v.createdAt == null || v.expiresAt == null || v.hardExpiresAt == null) continue;
        this.store.set(k, {
          value: v.value,
          createdAt: v.createdAt,
          expiresAt: v.expiresAt,
          hardExpiresAt: v.hardExpiresAt,
          hits: v.hits ?? 0,
          lastAccess: v.lastAccess ?? 0,
          size: v.size ?? byteSize(v.value),
        });
      }
    } catch {
      /* start empty */
    }
  }

  createdAt(key: string): number | null {
    return this.store.get(key)?.createdAt ?? null;
  }

  onChange(fn: Listener): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  async get<T>(key: string, policy: CachePolicy, loader: () => Promise<T>): Promise<T> {
    const now = Date.now();
    const hit = this.store.get(key) as Entry<T> | undefined;

    if (hit && now < hit.expiresAt) {
      hit.hits++;
      hit.lastAccess = now;
      this.counters.hits++;
      this.emit({ type: "hit", key });
      return hit.value;
    }

    const rateLimited = now < this.rateLimitedUntil;

    if (hit && now < hit.hardExpiresAt) {
      hit.hits++;
      hit.lastAccess = now;
      this.counters.hits++;
      if (!rateLimited) {
        this.counters.revalidations++;
        this.emit({ type: "revalidate", key });
        void this.revalidate(key, policy, loader);
      }
      return hit.value;
    }

    if (rateLimited) {
      if (hit) return hit.value;
      throw { status: 429, message: "Rate limited; retry later" };
    }

    this.counters.misses++;
    return this.load(key, policy, loader);
  }

  set<T>(key: string, value: T, policy: CachePolicy): void {
    const now = Date.now();
    const prev = this.store.get(key);
    this.store.set(key, {
      value,
      createdAt: now,
      expiresAt: now + policy.ttl,
      hardExpiresAt: now + policy.ttl + (policy.staleWhileRevalidate ?? 0),
      hits: prev?.hits ?? 0,
      lastAccess: prev?.lastAccess ?? 0,
      size: byteSize(value),
    });
    this.counters.sets++;
    this.evictIfNeeded();
    this.scheduleSave();
    this.emit({ type: "set", key });
  }

  patch<T extends object>(key: string, partial: Partial<T>): void {
    const hit = this.store.get(key) as Entry<T> | undefined;
    if (!hit) return;
    hit.value = { ...hit.value, ...partial };
    hit.size = byteSize(hit.value);
    this.counters.patches++;
    this.scheduleSave();
    this.emit({ type: "patch", key });
  }

  invalidate(key: string): void {
    if (this.store.delete(key)) {
      this.counters.invalidations++;
      this.scheduleSave();
      this.emit({ type: "invalidate", key });
    }
  }

  clear(): void {
    this.store.clear();
    this.inflight.clear();
    this.counters.clears++;
    this.scheduleSave();
    this.emit({ type: "clear" });
  }

  entries(): CacheEntryInfo[] {
    return [...this.store.entries()].map(([key, e]) => ({
      key,
      createdAt: e.createdAt,
      expiresAt: e.expiresAt,
      hardExpiresAt: e.hardExpiresAt,
      hits: e.hits,
      lastAccess: e.lastAccess,
      size: e.size,
      value: e.value,
    }));
  }

  stats(): CacheStats {
    const now = Date.now();
    let fresh = 0;
    let stale = 0;
    let expired = 0;
    let totalSize = 0;
    for (const e of this.store.values()) {
      totalSize += e.size;
      if (now < e.expiresAt) fresh++;
      else if (now < e.hardExpiresAt) stale++;
      else expired++;
    }
    return {
      entries: this.store.size,
      inflight: this.inflight.size,
      totalSize,
      fresh,
      stale,
      expired,
      ...this.counters,
      persisted: this.file !== null,
      persistFile: this.file,
    };
  }

  private load<T>(key: string, policy: CachePolicy, loader: () => Promise<T>): Promise<T> {
    const existing = this.inflight.get(key) as Promise<T> | undefined;
    if (existing) return existing;

    const p = loader()
      .then((value) => {
        this.set(key, value, policy);
        return value;
      })
      .catch((err) => {
        const ms = rateLimitDelayMs(err);
        if (ms != null) this.rateLimitedUntil = Date.now() + ms;
        throw err;
      })
      .finally(() => this.inflight.delete(key));

    this.inflight.set(key, p);
    return p;
  }

  private async revalidate<T>(
    key: string,
    policy: CachePolicy,
    loader: () => Promise<T>,
  ): Promise<void> {
    try {
      await this.load(key, policy, loader);
    } catch {}
  }

  private emit(e: CacheEvent): void {
    for (const fn of this.listeners) fn(e);
  }

  private scheduleSave(): void {
    if (!this.file || this.saveTimer) return;
    this.saveTimer = setTimeout(() => {
      this.saveTimer = null;
      this.flush();
    }, 250);
    this.saveTimer.unref?.();
  }

  private evictIfNeeded(): void {
    const now = Date.now();
    for (const [k, e] of this.store) {
      if (now >= e.hardExpiresAt) this.store.delete(k);
    }
    if (this.store.size <= this.maxEntries) return;
    const byAccess = [...this.store.entries()].sort(
      (a, b) => (a[1].lastAccess || a[1].createdAt) - (b[1].lastAccess || b[1].createdAt),
    );
    for (let i = 0; i < byAccess.length && this.store.size > this.maxEntries; i++) {
      this.store.delete(byAccess[i][0]);
    }
  }

  private flush(): void {
    if (!this.file) return;
    this.evictIfNeeded();
    const snapshot = JSON.stringify(Object.fromEntries(this.store));
    void writeFileAtomic(this.file, snapshot).catch(() => {
      /* persistence is best-effort */
    });
  }

  flushNow(): void {
    if (!this.file) return;
    if (this.saveTimer) {
      clearTimeout(this.saveTimer);
      this.saveTimer = null;
    }
    this.evictIfNeeded();
    try {
      writeFileAtomicSync(this.file, JSON.stringify(Object.fromEntries(this.store)));
    } catch {}
  }
}
