import type { ReactNode } from "react";

export function Tag({ children, color }: { children: ReactNode; color?: string }) {
  const c = color ?? "var(--muted)";
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full border px-[9px] py-[3px] text-[11.5px] font-semibold"
      style={{
        color: c,
        background: `color-mix(in srgb, ${c} 14%, transparent)`,
        borderColor: `color-mix(in srgb, ${c} 30%, transparent)`,
      }}
    >
      {children}
    </span>
  );
}
