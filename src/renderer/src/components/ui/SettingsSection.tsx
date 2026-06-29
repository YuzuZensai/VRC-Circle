import type { ReactNode } from "react";
import { Check, X } from "lucide-react";

export function SettingsSection({
  title,
  description,
  icon,
  danger,
  children,
}: {
  title: string;
  description?: ReactNode;
  icon?: ReactNode;
  danger?: boolean;
  children: ReactNode;
}) {
  return (
    <section
      className={`rounded-DEFAULT border px-6 py-[22px] shadow-[var(--shadow-1)] ${
        danger
          ? "border-[color-mix(in_srgb,var(--danger)_35%,var(--border))] bg-[color-mix(in_srgb,var(--danger)_6%,var(--surface-2))]"
          : "border-border bg-surface-2"
      }`}
    >
      <div className="mb-4">
        <h2 className="flex items-center gap-2 text-[15px] font-bold">
          {icon ? <span className="text-muted">{icon}</span> : null}
          {title}
        </h2>
        {description ? <p className="mt-1 text-[13px] text-muted">{description}</p> : null}
      </div>
      {children}
    </section>
  );
}

export function Notice({ error, ok }: { error?: string | null; ok?: string | null }) {
  if (error)
    return (
      <p className="mt-3 flex items-center gap-1.5 text-[12.5px] text-[var(--danger)]">
        <X size={14} /> {error}
      </p>
    );
  if (ok)
    return (
      <p className="mt-3 flex items-center gap-1.5 text-[12.5px] text-[var(--status-active)]">
        <Check size={14} /> {ok}
      </p>
    );
  return null;
}
