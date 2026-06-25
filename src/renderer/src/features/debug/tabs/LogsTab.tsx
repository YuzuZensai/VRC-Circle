import { useMemo, useState } from "react";
import type { LogEntry, LogLevel } from "../../../../../shared/types/debug";
import { Button, Panel } from "../../../components/ui";
import { Chip, Empty, SearchInput, formatTime } from "../ui";

const LEVELS: LogLevel[] = ["debug", "info", "warn", "error"];
const levelTone: Record<LogLevel, string> = {
  debug: "var(--faint)",
  info: "var(--muted)",
  warn: "var(--status-ask)",
  error: "var(--danger)",
};

export function LogsTab({ logs, onClear }: { logs: LogEntry[]; onClear: () => void }) {
  const [min, setMin] = useState<LogLevel>("debug");
  const [query, setQuery] = useState("");
  const minIdx = LEVELS.indexOf(min);

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return logs.filter(
      (l) =>
        LEVELS.indexOf(l.level) >= minIdx &&
        (q ? `${l.scope} ${l.message}`.toLowerCase().includes(q) : true),
    );
  }, [logs, minIdx, query]);

  return (
    <Panel
      title="Logs"
      meta={`${shown.length}/${logs.length}`}
      className="min-h-0 flex-1"
      action={
        <Button variant="ghost" onClick={onClear} disabled={logs.length === 0}>
          Clear
        </Button>
      }
    >
      <div className="flex shrink-0 flex-wrap items-center gap-2 border-b border-border px-4 py-2.5">
        <SearchInput value={query} onChange={setQuery} placeholder="Search logs…" />
        <div className="flex gap-1">
          {LEVELS.map((l) => (
            <Chip key={l} active={min === l} onClick={() => setMin(l)}>
              ≥ {l}
            </Chip>
          ))}
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col-reverse overflow-auto p-2 font-mono text-[11.5px] leading-relaxed">
        {shown.length === 0 ? (
          <Empty>No logs match.</Empty>
        ) : (
          shown
            .slice()
            .reverse()
            .map((l) => (
              <div key={l.id} className="flex gap-2 rounded px-2 py-0.5 hover:bg-surface-2">
                <span className="shrink-0 tabular-nums text-faint">{formatTime(l.ts)}</span>
                <span
                  className="w-10 shrink-0 font-semibold uppercase"
                  style={{ color: levelTone[l.level] }}
                >
                  {l.level}
                </span>
                <span className="shrink-0 text-accent">{l.scope}</span>
                <span className="min-w-0 break-words text-muted">{l.message}</span>
              </div>
            ))
        )}
      </div>
    </Panel>
  );
}
