import type { ReactNode } from "react";

export function Panel({
  title,
  meta,
  action,
  children,
  className = "",
}: {
  title: ReactNode;
  meta?: ReactNode;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`flex min-h-0 flex-col overflow-hidden rounded-lg border border-border bg-surface ${className}`}
    >
      <header className="flex items-center gap-3 border-b border-border px-4 py-3">
        <h2 className="text-sm font-bold">{title}</h2>
        {meta ? <span className="text-xs text-faint">{meta}</span> : null}
        {action ? <div className="ml-auto">{action}</div> : null}
      </header>
      {children}
    </section>
  );
}
