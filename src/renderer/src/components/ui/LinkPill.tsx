import type { ReactNode } from "react";

export function LinkPill({ href, children }: { href: string; children: ReactNode }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="rounded-full border border-border bg-surface px-3 py-1 text-[12.5px] font-semibold text-muted transition-colors hover:border-accent hover:text-accent"
    >
      {children}
    </a>
  );
}
