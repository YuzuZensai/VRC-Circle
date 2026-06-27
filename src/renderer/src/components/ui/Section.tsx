import { useState, type ReactNode } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { LABEL_HEADING as HEADING } from "./styles";

export function Section({
  title,
  children,
  collapsible,
  defaultOpen = true,
}: {
  title: string;
  children: ReactNode;
  collapsible?: boolean;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(collapsible ? defaultOpen : true);
  return (
    <section className="rounded-xl border border-border bg-surface-2 p-5 shadow-sm">
      {collapsible ? (
        <button
          onClick={() => setOpen((v) => !v)}
          className={`flex w-full items-center gap-1.5 ${HEADING} ${open ? "mb-3" : ""}`}
        >
          <span className="text-faint">
            {open ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          </span>
          {title}
        </button>
      ) : (
        <h3 className={`mb-3 ${HEADING}`}>{title}</h3>
      )}
      {open ? <div className="flex flex-col gap-3">{children}</div> : null}
    </section>
  );
}

export function Fact({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <dt className="mb-0.5 text-[11px] uppercase tracking-wide text-faint">{label}</dt>
      <dd
        className={mono ? "break-all font-mono text-[12px] text-muted" : "text-[13.5px] text-text"}
      >
        {value}
      </dd>
    </div>
  );
}
