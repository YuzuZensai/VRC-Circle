import { useMemo, useState } from "react";
import { ChevronDown, ChevronRight, X } from "lucide-react";
import type { CacheEntryInfo, CacheStats } from "../../../../../shared/types/debug";
import { Badge, Button, CodeBlock, Panel, Stat } from "../../../components/ui";
import { useNow } from "../useDebug";
import {
  Chip,
  Empty,
  Meta,
  SearchInput,
  cacheStatus,
  formatBytes,
  formatDuration,
  formatTime,
  statusColor,
  statusTone,
} from "../ui";

type CacheFilter = "all" | "fresh" | "stale" | "expired";

const CACHE_GROUPS = ["Worlds", "Users", "Friends", "Search", "Other"] as const;

function cacheGroupOf(key: string): string {
  if (key.startsWith("user:worlds:")) return "Worlds";
  if (key.startsWith("user:search:")) return "Search";
  if (key === "friends") return "Friends";
  if (key === "user:me" || key.startsWith("user:")) return "Users";
  return "Other";
}

export function CacheTab({
  cache,
  stats,
  onInvalidate,
  onClear,
}: {
  cache: CacheEntryInfo[];
  stats: CacheStats | null;
  onInvalidate: (key: string) => void;
  onClear: () => void;
}) {
  const now = useNow();
  const [filter, setFilter] = useState<CacheFilter>("all");
  const [query, setQuery] = useState("");

  const hitRate =
    stats && stats.hits + stats.misses > 0
      ? Math.round((stats.hits / (stats.hits + stats.misses)) * 100)
      : null;

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return [...cache]
      .filter((e) => (filter === "all" ? true : cacheStatus(e, now) === filter))
      .filter((e) => (q ? e.key.toLowerCase().includes(q) : true))
      .sort((a, b) => a.key.localeCompare(b.key));
  }, [cache, filter, query, now]);

  const groups = useMemo(() => {
    const by = new Map<string, CacheEntryInfo[]>();
    for (const e of shown) {
      const g = cacheGroupOf(e.key);
      (by.get(g) ?? by.set(g, []).get(g)!).push(e);
    }
    const order = (g: string) => {
      const i = CACHE_GROUPS.indexOf(g as (typeof CACHE_GROUPS)[number]);
      return i === -1 ? CACHE_GROUPS.length : i;
    };
    return [...by.entries()].sort((a, b) => order(a[0]) - order(b[0]));
  }, [shown]);

  return (
    <div className="flex min-h-0 flex-col gap-4">
      {stats ? (
        <Panel
          title="Cache stats"
          meta={stats.persisted ? `persisted · ${formatBytes(stats.totalSize)}` : "in-memory"}
        >
          <div className="grid grid-cols-2 gap-2 p-4 sm:grid-cols-4 lg:grid-cols-6">
            <Stat label="Entries" value={stats.entries} />
            <Stat label="Fresh" value={stats.fresh} tone="var(--status-active)" />
            <Stat label="Stale" value={stats.stale} tone="var(--status-ask)" />
            <Stat label="Expired" value={stats.expired} tone="var(--danger)" />
            <Stat label="In-flight" value={stats.inflight} />
            <Stat
              label="Hit rate"
              value={hitRate === null ? "—" : `${hitRate}%`}
              tone="var(--accent)"
            />
            <Stat label="Hits" value={stats.hits} />
            <Stat label="Misses" value={stats.misses} />
            <Stat label="Sets" value={stats.sets} />
            <Stat label="Patches" value={stats.patches} />
            <Stat label="Revalidated" value={stats.revalidations} />
            <Stat label="Invalidated" value={stats.invalidations} />
          </div>
        </Panel>
      ) : null}

      <Panel
        title="Cache entries"
        meta={`${shown.length}/${cache.length} · pull / TTL`}
        action={
          <Button variant="ghost" onClick={onClear} disabled={cache.length === 0}>
            Clear all
          </Button>
        }
        className="min-h-0 flex-1"
      >
        <div className="flex shrink-0 flex-wrap items-center gap-2 border-b border-border px-4 py-2.5">
          <SearchInput value={query} onChange={setQuery} placeholder="Filter keys…" />
          <div className="flex gap-1">
            {(["all", "fresh", "stale", "expired"] as CacheFilter[]).map((f) => (
              <Chip key={f} active={filter === f} onClick={() => setFilter(f)}>
                {f}
              </Chip>
            ))}
          </div>
        </div>

        <div className="flex min-h-0 flex-1 flex-col overflow-auto">
          {shown.length === 0 ? (
            <Empty>{cache.length === 0 ? "Cache is empty." : "No entries match."}</Empty>
          ) : (
            groups.map(([group, entries]) => (
              <div key={group}>
                <div className="sticky top-0 z-10 flex items-center gap-2 bg-surface-2 px-4 py-1.5 text-[10.5px] font-semibold uppercase tracking-wide text-faint">
                  {group}
                  <span className="text-faint/70">{entries.length}</span>
                </div>
                {entries.map((e) => (
                  <CacheRow
                    key={e.key}
                    entry={e}
                    now={now}
                    onInvalidate={() => onInvalidate(e.key)}
                  />
                ))}
              </div>
            ))
          )}
        </div>
      </Panel>
    </div>
  );
}

function CacheRow({
  entry,
  now,
  onInvalidate,
}: {
  entry: CacheEntryInfo;
  now: number;
  onInvalidate: () => void;
}) {
  const [open, setOpen] = useState(false);
  const remaining = entry.expiresAt - now;
  const total = entry.expiresAt - entry.createdAt;
  const pct = total > 0 ? Math.max(0, Math.min(100, (remaining / total) * 100)) : 0;
  const age = Math.max(0, Math.round((now - entry.createdAt) / 1000));
  const status = cacheStatus(entry, now);

  return (
    <div className="border-b border-border last:border-b-0">
      <div className="flex items-center gap-2 px-4 py-2.5">
        <button
          className="flex min-w-0 flex-1 items-center gap-2.5 text-left"
          onClick={() => setOpen((v) => !v)}
        >
          <span className="flex w-3 shrink-0 justify-center text-faint">
            {open ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
          </span>
          <Badge tone={statusTone[status]}>{status}</Badge>
          <code className="truncate font-mono text-xs text-text">{entry.key}</code>
        </button>

        <span className="hidden shrink-0 items-center gap-3 text-[11px] tabular-nums text-faint sm:flex">
          <span title="cache hits">{entry.hits} hits</span>
          <span title="value size">{formatBytes(entry.size)}</span>
          <span title="age since cached">{formatDuration(age)} old</span>
          <span className="w-12 text-right" title="time until stale">
            {status === "fresh" ? formatDuration(Math.round(remaining / 1000)) : status}
          </span>
        </span>

        <button
          className="shrink-0 rounded px-1.5 leading-none text-faint transition-colors hover:text-danger"
          title="Invalidate"
          onClick={onInvalidate}
        >
          <X size={16} />
        </button>
      </div>

      <div className="px-4 pb-1.5">
        <div className="h-1 overflow-hidden rounded-full bg-surface-2">
          <div
            className="h-full rounded-full transition-[width] duration-700 ease-linear"
            style={{ width: `${pct}%`, background: statusColor[status] }}
          />
        </div>
      </div>

      {open ? (
        <div className="px-4 pb-3">
          <dl className="mb-2 grid grid-cols-2 gap-x-4 gap-y-1 text-[11px] sm:grid-cols-4">
            <Meta label="Created" value={formatTime(entry.createdAt)} />
            <Meta label="Stale at" value={formatTime(entry.expiresAt)} />
            <Meta label="Hard expiry" value={formatTime(entry.hardExpiresAt)} />
            <Meta
              label="Last read"
              value={entry.lastAccess ? formatTime(entry.lastAccess) : "never"}
            />
          </dl>
          <CodeBlock value={JSON.stringify(entry.value, null, 2)} />
        </div>
      ) : null}
    </div>
  );
}
