import type { ReactNode } from "react";
import { LABEL_HEADING } from "./styles";

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
      <div className={`flex items-center gap-1.5 ${LABEL_HEADING}`}>
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
