import { useState, type ReactNode } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { LABEL_HEADING } from "./styles";

export function CollapsibleCard({
  title,
  count,
  action,
  defaultOpen = true,
  children,
}: {
  title: string;
  count?: number | string;
  action?: ReactNode;
  defaultOpen?: boolean;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <section className="rounded-xl border border-border bg-surface-2 p-5 shadow-sm">
      <div className={`flex items-center gap-1.5 ${open ? "mb-3" : ""}`}>
        <button
          onClick={() => setOpen((v) => !v)}
          className={`flex flex-1 items-center gap-1.5 ${LABEL_HEADING}`}
        >
          <span className="text-faint">
            {open ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          </span>
          {title}
          {count !== undefined ? <span className="text-faint/70">{count}</span> : null}
        </button>
        {action}
      </div>
      {open ? children : null}
    </section>
  );
}
