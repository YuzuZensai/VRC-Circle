import { useState, type ReactNode } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";

export function CollapsibleCard({
  title,
  count,
  defaultOpen = true,
  children,
}: {
  title: string;
  count?: number | string;
  defaultOpen?: boolean;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <section className="rounded-xl border border-border bg-surface-2 p-5 shadow-sm">
      <button
        onClick={() => setOpen((v) => !v)}
        className={`flex w-full items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-faint ${
          open ? "mb-3" : ""
        }`}
      >
        <span className="text-faint">
          {open ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        </span>
        {title}
        {count !== undefined ? <span className="text-faint/70">{count}</span> : null}
      </button>
      {open ? children : null}
    </section>
  );
}
