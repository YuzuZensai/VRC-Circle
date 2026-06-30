import { useState, type ReactNode } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { LABEL_HEADING } from "./styles";
import { useCollapsed } from "../../store/ui";

export function CollapsibleCard({
  title,
  count,
  action,
  defaultOpen = true,
  persistKey,
  children,
}: {
  title: string;
  count?: number | string;
  action?: ReactNode;
  defaultOpen?: boolean;
  persistKey?: string;
  children: ReactNode;
}) {
  const local = useState(defaultOpen);
  const persisted = useCollapsed(persistKey ?? "", defaultOpen);
  const [open, toggle] = persistKey
    ? persisted
    : [local[0], () => local[1]((v) => !v)];
  return (
    <section className="rounded-xl border border-border bg-surface-2 p-5 shadow-sm">
      <div className={`flex items-center gap-1.5 ${open ? "mb-3" : ""}`}>
        <button
          onClick={toggle}
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
