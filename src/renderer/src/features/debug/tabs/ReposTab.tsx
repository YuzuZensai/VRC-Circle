import { useEffect, useMemo, useState } from "react";
import { ChevronDown, ChevronRight, Trash2 } from "lucide-react";
import type { RepoStats, StoredEntity } from "../../../../../shared/types/repository";
import { Button, Panel, Stat } from "../../../components/ui";
import { api } from "../../../lib/api";
import { useCopied, useNow } from "../useDebug";
import {
  Empty,
  Meta,
  SearchInput,
  formatBytes,
  formatFieldValue,
  relativeAge,
  sourceColor,
} from "../ui";

export function ReposTab({ repos }: { repos: RepoStats[] }) {
  const now = useNow(2000);
  const [selected, setSelected] = useState<string | null>(null);

  const totalCount = repos.reduce((s, r) => s + r.count, 0);
  const totalSize = repos.reduce((s, r) => s + r.totalSize, 0);
  const pending = repos.reduce((s, r) => s + r.pendingWrites, 0);
  const dir = repos[0]?.backendFile?.replace(/[^/]+$/, "") ?? null;

  if (selected) {
    return <RepoInspector name={selected} onBack={() => setSelected(null)} now={now} />;
  }

  return (
    <div className="flex min-h-0 flex-col gap-4">
      <Panel title="Entity repositories" meta={`persisted · ${formatBytes(totalSize)}`}>
        <div className="grid grid-cols-2 gap-2 p-4 sm:grid-cols-4">
          <Stat label="Entities" value={totalCount} />
          <Stat label="Size" value={formatBytes(totalSize)} />
          <Stat label="Types" value={repos.length} />
          <Stat
            label="Pending writes"
            value={pending}
            tone={pending > 0 ? "var(--status-ask)" : undefined}
          />
        </div>
        {dir ? (
          <p className="border-t border-border px-4 py-2 text-[11px] text-faint">Stored at {dir}</p>
        ) : null}
      </Panel>

      {repos.length === 0 ? (
        <Panel title="By type">
          <Empty>No active account — repositories load when signed in.</Empty>
        </Panel>
      ) : (
        <div className="grid gap-3 sm:grid-cols-3">
          {repos.map((r) => (
            <RepoCard key={r.name} repo={r} now={now} onInspect={() => setSelected(r.name)} />
          ))}
        </div>
      )}
    </div>
  );
}

function RepoCard({
  repo,
  now,
  onInspect,
}: {
  repo: RepoStats;
  now: number;
  onInspect: () => void;
}) {
  const [busy, setBusy] = useState<"flush" | "clear" | null>(null);

  async function flush() {
    setBusy("flush");
    try {
      await api.debug.repoFlush(repo.name);
    } finally {
      setBusy(null);
    }
  }
  async function clear() {
    setBusy("clear");
    try {
      await api.debug.repoClear(repo.name);
    } finally {
      setBusy(null);
    }
  }

  return (
    <Panel title={repo.name} meta={formatBytes(repo.totalSize)}>
      <div className="grid grid-cols-2 gap-2 p-3">
        <Stat label="Entities" value={repo.count} />
        <Stat
          label="Pending"
          value={repo.pendingWrites}
          tone={repo.pendingWrites > 0 ? "var(--status-ask)" : undefined}
        />
      </div>
      <dl className="grid grid-cols-2 gap-x-3 gap-y-1 px-3 pb-2 text-[11px]">
        <Meta
          label="Last fetch"
          value={repo.newestFetch ? relativeAge(now, repo.newestFetch) : "—"}
        />
        <Meta
          label="Oldest read"
          value={repo.oldestRead ? relativeAge(now, repo.oldestRead) : "—"}
        />
      </dl>
      <div className="flex items-center gap-1.5 border-t border-border px-3 py-2">
        <Button variant="ghost" onClick={onInspect} disabled={repo.count === 0}>
          Inspect
        </Button>
        <Button
          variant="ghost"
          onClick={flush}
          loading={busy === "flush"}
          disabled={repo.pendingWrites === 0}
        >
          Flush
        </Button>
        <Button
          variant="ghost"
          onClick={clear}
          loading={busy === "clear"}
          disabled={repo.count === 0}
        >
          <Trash2 size={13} /> Clear
        </Button>
      </div>
    </Panel>
  );
}

function RepoInspector({ name, onBack, now }: { name: string; onBack: () => void; now: number }) {
  const [entities, setEntities] = useState<StoredEntity<{ id: string }>[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);

  const reload = () => {
    setLoading(true);
    api.debug
      .repoInspect(name)
      .then((e) => setEntities(e))
      .finally(() => setLoading(false));
  };

  useEffect(reload, [name]);

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return [...entities]
      .filter((e) => {
        if (!q) return true;
        const blob = `${e.data.id} ${JSON.stringify(e.data).toLowerCase()}`;
        return blob.includes(q);
      })
      .sort((a, b) => (b.meta.lastFetch ?? 0) - (a.meta.lastFetch ?? 0))
      .slice(0, 300);
  }, [entities, query]);

  return (
    <Panel
      title={`${name} inspector`}
      meta={`${shown.length}/${entities.length} shown`}
      className="min-h-0 flex-1"
      action={
        <div className="flex items-center gap-1.5">
          <Button variant="ghost" onClick={reload} loading={loading}>
            Refresh
          </Button>
          <Button variant="ghost" onClick={onBack}>
            ← Back
          </Button>
        </div>
      }
    >
      <div className="shrink-0 border-b border-border px-4 py-2.5">
        <SearchInput value={query} onChange={setQuery} placeholder="Filter by id or any field…" />
      </div>
      <div className="flex min-h-0 flex-1 flex-col overflow-auto">
        {shown.length === 0 ? (
          <Empty>{entities.length === 0 ? "Repository is empty." : "No entities match."}</Empty>
        ) : (
          shown.map((e) => <EntityRow key={e.data.id} entity={e} now={now} />)
        )}
      </div>
    </Panel>
  );
}

function EntityRow({ entity, now }: { entity: StoredEntity<{ id: string }>; now: number }) {
  const [open, setOpen] = useState(false);
  const [copied, copy] = useCopied();
  const data = entity.data as Record<string, unknown>;
  const label = (data.name ?? data.displayName ?? data.id) as string;
  const fieldNames = Object.keys(entity.meta.fields).sort();

  return (
    <div className="border-b border-border last:border-b-0">
      <button
        className="flex w-full items-center gap-2.5 px-4 py-2 text-left hover:bg-surface-2"
        onClick={() => setOpen((v) => !v)}
      >
        <span className="flex w-3 shrink-0 justify-center text-faint">
          {open ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
        </span>
        <div className="flex min-w-0 flex-1 flex-col">
          <span className="truncate text-[13px] font-medium">{label}</span>
          <code className="truncate font-mono text-[10px] text-faint">{entity.data.id}</code>
        </div>
        <span className="shrink-0 text-[11px] tabular-nums text-faint">
          {fieldNames.length} fields
        </span>
        <span className="shrink-0 text-[11px] tabular-nums text-faint">
          {relativeAge(now, entity.meta.lastFetch)}
        </span>
      </button>
      {open ? (
        <div className="px-4 pb-3 pl-[2.4rem]">
          <div className="mb-2 overflow-hidden rounded-md border border-border">
            <table className="w-full text-[11px]">
              <thead className="bg-surface-2 text-faint">
                <tr className="text-left">
                  <th className="px-2 py-1 font-medium">Field</th>
                  <th className="px-2 py-1 font-medium">Value</th>
                  <th className="px-2 py-1 font-medium">Source</th>
                  <th className="px-2 py-1 text-right font-medium">Updated</th>
                </tr>
              </thead>
              <tbody>
                {fieldNames.map((f) => {
                  const meta = entity.meta.fields[f];
                  return (
                    <tr key={f} className="border-t border-border/50">
                      <td className="px-2 py-1 font-mono text-muted">{f}</td>
                      <td className="max-w-[14rem] truncate px-2 py-1 font-mono text-text">
                        {formatFieldValue(data[f])}
                      </td>
                      <td className="px-2 py-1">
                        <span style={{ color: sourceColor(meta.src) }}>{meta.src}</span>
                      </td>
                      <td className="px-2 py-1 text-right tabular-nums text-faint">
                        {meta.at ? relativeAge(now, meta.at) : "stale"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <dl className="mb-2 grid grid-cols-2 gap-x-4 gap-y-1 text-[11px] sm:grid-cols-3">
            <Meta label="First seen" value={relativeAge(now, entity.meta.firstSeen)} />
            <Meta label="Last read" value={relativeAge(now, entity.meta.lastRead)} />
            <Meta label="Last fetch" value={relativeAge(now, entity.meta.lastFetch)} />
          </dl>
          <div className="relative">
            <button
              className="absolute right-2 top-2 rounded border border-border bg-surface px-2 py-0.5 text-[10.5px] font-semibold text-muted transition-colors hover:text-accent"
              onClick={() => copy(JSON.stringify(entity, null, 2))}
            >
              {copied ? "Copied!" : "Copy"}
            </button>
            <pre className="max-h-72 overflow-auto rounded-md border border-border bg-surface-2 p-3 font-mono text-[11px] leading-relaxed text-muted">
              {JSON.stringify(entity.data, null, 2)}
            </pre>
          </div>
        </div>
      ) : null}
    </div>
  );
}
