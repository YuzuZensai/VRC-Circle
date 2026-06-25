import type { ReactNode } from "react";

export function Stat({
  label,
  value,
  tone,
}: {
  label: ReactNode;
  value: ReactNode;
  tone?: string;
}) {
  return (
    <div className="rounded-md border border-border bg-surface-2 px-3 py-2">
      <div className="text-[10.5px] uppercase tracking-wide text-faint">{label}</div>
      <div
        className="mt-0.5 text-lg font-bold tabular-nums"
        style={tone ? { color: tone } : undefined}
      >
        {value}
      </div>
    </div>
  );
}
