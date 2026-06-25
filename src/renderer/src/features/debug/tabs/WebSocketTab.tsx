import { useMemo, useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import type { WsEvent } from "../../../../../shared/types/debug";
import { Badge, Button, Panel } from "../../../components/ui";
import { useCopied } from "../useDebug";
import { Chip, Empty, SearchInput, formatTime } from "../ui";

export function WsTab({ ws, onClear }: { ws: WsEvent[]; onClear: () => void }) {
  const [query, setQuery] = useState("");
  const [onlyHandled, setOnlyHandled] = useState(false);

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return ws.filter(
      (e) => (onlyHandled ? e.handled : true) && (q ? e.type.toLowerCase().includes(q) : true),
    );
  }, [ws, query, onlyHandled]);

  return (
    <Panel
      title="WebSocket events"
      meta={`${shown.length}/${ws.length} received`}
      className="min-h-0 flex-1"
      action={
        <Button variant="ghost" onClick={onClear} disabled={ws.length === 0}>
          Clear
        </Button>
      }
    >
      <div className="flex shrink-0 flex-wrap items-center gap-2 border-b border-border px-4 py-2.5">
        <SearchInput value={query} onChange={setQuery} placeholder="Filter by event type…" />
        <Chip active={onlyHandled} onClick={() => setOnlyHandled((v) => !v)}>
          handled only
        </Chip>
      </div>
      <div className="flex min-h-0 flex-1 flex-col overflow-auto">
        {shown.length === 0 ? (
          <Empty>{ws.length === 0 ? "No events yet" : "No events match."}</Empty>
        ) : (
          shown
            .slice()
            .reverse()
            .map((e) => <WsRow key={e.id} event={e} />)
        )}
      </div>
    </Panel>
  );
}

function WsRow({ event }: { event: WsEvent }) {
  const [open, setOpen] = useState(false);
  const [copied, copy] = useCopied();
  return (
    <div className="border-b border-border last:border-b-0">
      <button
        className="flex w-full items-center gap-2.5 px-4 py-1.5 text-left hover:bg-surface-2"
        onClick={() => setOpen((v) => !v)}
      >
        <span className="flex w-3 shrink-0 justify-center text-faint">
          {open ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
        </span>
        <span className="shrink-0 tabular-nums text-[11px] text-faint">{formatTime(event.ts)}</span>
        <code className="flex-1 truncate font-mono text-xs text-accent">{event.type}</code>
        {event.handled ? <Badge tone="success">handled</Badge> : <Badge>observed</Badge>}
      </button>
      {open ? (
        <div className="px-4 pb-3 pl-[2.4rem]">
          <div className="relative">
            <button
              className="absolute right-2 top-2 rounded border border-border bg-surface px-2 py-0.5 text-[10.5px] font-semibold text-muted transition-colors hover:text-accent"
              onClick={() => copy(JSON.stringify(event.content, null, 2))}
            >
              {copied ? "Copied!" : "Copy"}
            </button>
            <pre className="max-h-72 overflow-auto rounded-md border border-border bg-surface-2 p-3 font-mono text-[11px] leading-relaxed text-muted">
              {JSON.stringify(event.content, null, 2)}
            </pre>
          </div>
        </div>
      ) : null}
    </div>
  );
}
