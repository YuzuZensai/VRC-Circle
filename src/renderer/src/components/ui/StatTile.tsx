import type { ReactNode } from "react";

export function StatTile({
  icon,
  label,
  value,
  live,
}: {
  icon?: ReactNode;
  label: string;
  value: string;
  live?: boolean;
}) {
  return (
    <div className="rounded-xl border border-border bg-surface-2 p-4 shadow-sm">
      <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-faint">
        {icon} {label}
      </div>
      <div
        className="mt-1 text-2xl font-bold tabular-nums"
        style={live ? { color: "var(--status-active)" } : undefined}
      >
        {value}
      </div>
    </div>
  );
}
