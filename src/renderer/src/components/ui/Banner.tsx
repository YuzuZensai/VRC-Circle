import type { ReactNode } from "react";

export function Banner({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={`flex animate-pop items-center gap-2.5 rounded-sm border px-[13px] py-2.5 text-[13.5px] ${className}`}
      style={{
        color: "color-mix(in srgb, var(--danger) 75%, var(--text))",
        background: "color-mix(in srgb, var(--danger) 12%, transparent)",
        borderColor: "color-mix(in srgb, var(--danger) 35%, transparent)",
      }}
    >
      {children}
    </div>
  );
}
