import type { ReactNode } from "react";

const TONE = {
  neutral: "var(--muted)",
  accent: "var(--accent)",
  success: "var(--status-active)",
  warn: "var(--status-ask)",
  danger: "var(--danger)",
} as const;

export function Badge({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: keyof typeof TONE;
}) {
  const color = TONE[tone];
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide"
      style={{ color, background: `color-mix(in srgb, ${color} 15%, transparent)` }}
    >
      {children}
    </span>
  );
}
