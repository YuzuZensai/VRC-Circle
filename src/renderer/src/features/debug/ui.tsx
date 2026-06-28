import { X } from "lucide-react";
import type { CacheEntryInfo, CacheStatus } from "../../../../shared/types/debug";

export { formatBytes } from "../../lib/format";

export const statusTone = {
  fresh: "success",
  stale: "warn",
  expired: "danger",
} as const;
export const statusColor = {
  fresh: "var(--status-active)",
  stale: "var(--status-ask)",
  expired: "var(--danger)",
} as const;

const SOURCE_COLOR: Record<string, string> = {
  ws: "var(--status-active)",
  "rest:detail": "var(--accent)",
  "rest:list": "var(--muted)",
  "rest:search": "var(--faint)",
  seed: "var(--faint)",
};
export function sourceColor(src: string): string {
  return SOURCE_COLOR[src] ?? "var(--muted)";
}

export function formatFieldValue(v: unknown): string {
  if (v === null) return "null";
  if (v === undefined) return "—";
  if (Array.isArray(v)) return `[${v.length}]`;
  if (typeof v === "object") return "{…}";
  return String(v);
}

export function relativeAge(now: number, ts: number): string {
  if (!ts) return "stale";
  const s = Math.max(0, Math.round((now - ts) / 1000));
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

export function cacheStatus(e: CacheEntryInfo, now: number): CacheStatus {
  return now < e.expiresAt ? "fresh" : now < e.hardExpiresAt ? "stale" : "expired";
}

export function formatDuration(s: number): string {
  if (s < 60) return `${s}s`;
  if (s < 3600) return `${Math.floor(s / 60)}m ${s % 60}s`;
  return `${Math.floor(s / 3600)}h ${Math.floor((s % 3600) / 60)}m`;
}

export function formatTime(ts: number): string {
  return new Date(ts).toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

export function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-[13px] font-semibold transition-colors ${
        active ? "bg-accent text-on-accent" : "text-muted hover:bg-surface-2 hover:text-text"
      }`}
    >
      {children}
    </button>
  );
}

export function Count({ n }: { n: number }) {
  return <span className="rounded-full bg-black/15 px-1.5 text-[11px] tabular-nums">{n}</span>;
}

export function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold capitalize transition-colors ${
        active
          ? "border-accent bg-accent-weak text-accent"
          : "border-border text-muted hover:text-text"
      }`}
    >
      {children}
    </button>
  );
}

export function SearchInput({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
}) {
  return (
    <div className="relative min-w-0 flex-1">
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-md border border-border bg-surface-2 px-3 py-1.5 text-xs text-text placeholder:text-faint focus:border-accent focus:outline-none"
      />
      {value ? (
        <button
          className="absolute right-2 top-1/2 flex -translate-y-1/2 items-center text-faint hover:text-text"
          onClick={() => onChange("")}
        >
          <X size={14} />
        </button>
      ) : null}
    </div>
  );
}

export function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-faint">{label}</dt>
      <dd className="tabular-nums text-muted">{value}</dd>
    </div>
  );
}

export function Empty({ children }: { children: React.ReactNode }) {
  return <p className="px-4 py-8 text-center text-[13px] text-faint">{children}</p>;
}
