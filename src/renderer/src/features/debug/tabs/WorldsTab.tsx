import { useMemo, useState } from "react";
import { ChevronDown, ChevronRight, Star } from "lucide-react";
import type { World } from "../../../../../shared/types/world";
import { Badge, Panel } from "../../../components/ui";
import { useAllWorlds, useWorlds } from "../../../store/worlds";
import { useCopied } from "../useDebug";
import { Empty, SearchInput } from "../ui";

export function WorldStorePanel() {
  const worlds = useAllWorlds();
  const byAuthor = useWorlds((s) => s.byAuthor);
  const authorCount = Object.keys(byAuthor).length;
  const [query, setQuery] = useState("");

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return [...worlds]
      .filter((w) => (q ? w.name.toLowerCase().includes(q) || w.id.includes(q) : true))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [worlds, query]);

  return (
    <Panel
      title="World store"
      meta={`${shown.length}/${worlds.length} worlds · ${authorCount} authors`}
      className="min-h-0 flex-1"
    >
      <div className="shrink-0 border-b border-border px-4 py-2.5">
        <SearchInput value={query} onChange={setQuery} placeholder="Filter by name or id…" />
      </div>
      <div className="flex min-h-0 flex-1 flex-col overflow-auto">
        {shown.length === 0 ? (
          <Empty>
            {worlds.length === 0
              ? "No worlds yet — open a profile to seed it."
              : "No worlds match."}
          </Empty>
        ) : (
          shown.map((w) => <WorldStoreRow key={w.id} world={w} />)
        )}
      </div>
    </Panel>
  );
}

function WorldStoreRow({ world }: { world: World }) {
  const [open, setOpen] = useState(false);
  const [copied, copy] = useCopied();
  const img = world.thumbnailImageUrl || world.imageUrl;
  return (
    <div className="border-b border-border last:border-b-0">
      <button
        className="flex w-full items-center gap-2.5 px-4 py-2 text-left hover:bg-surface-2"
        onClick={() => setOpen((v) => !v)}
      >
        <span className="flex w-3 shrink-0 justify-center text-faint">
          {open ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
        </span>
        {img ? (
          <img src={img} alt="" className="h-8 w-12 shrink-0 rounded object-cover" />
        ) : (
          <span className="h-8 w-12 shrink-0 rounded bg-surface-hover" />
        )}
        <div className="flex min-w-0 flex-1 flex-col">
          <span className="truncate text-[13px] font-medium">{world.name}</span>
          <code className="truncate font-mono text-[10px] text-faint">{world.id}</code>
        </div>
        {world.releaseStatus !== "public" ? <Badge tone="warn">{world.releaseStatus}</Badge> : null}
        <span className="flex shrink-0 items-center gap-1 text-[11px] tabular-nums text-faint">
          <Star size={11} /> {world.favorites}
        </span>
      </button>
      {open ? (
        <div className="px-4 pb-3 pl-[2.4rem]">
          <div className="relative">
            <button
              className="absolute right-2 top-2 rounded border border-border bg-surface px-2 py-0.5 text-[10.5px] font-semibold text-muted transition-colors hover:text-accent"
              onClick={() => copy(JSON.stringify(world, null, 2))}
            >
              {copied ? "Copied!" : "Copy"}
            </button>
            <pre className="max-h-72 overflow-auto rounded-md border border-border bg-surface-2 p-3 font-mono text-[11px] leading-relaxed text-muted">
              {JSON.stringify(world, null, 2)}
            </pre>
          </div>
        </div>
      ) : null}
    </div>
  );
}
