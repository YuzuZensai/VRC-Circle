import { useState, type ReactNode } from "react";
import { Check, ExternalLink, X } from "lucide-react";
import type { AccountSettings } from "../../../../shared/types/settings";
import { errorMessage } from "../../lib/api";
import { useI18n } from "../../lib/i18n";
import { Toggle } from "../../components/ui";

export type TFunc = ReturnType<typeof useI18n>["t"];

export type SectionProps = {
  settings: AccountSettings;
  onChange: (s: AccountSettings) => void;
};

export const WEBSITE_ACCOUNT = "https://vrchat.com/home/profile";

export function Section({
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

export function useAction() {
  const { t } = useI18n();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  async function run<T>(p: Promise<T>, opts?: { onOk?: (v: T) => void; okMsg?: string }) {
    setBusy(true);
    setError(null);
    setOk(null);
    try {
      const v = await p;
      opts?.onOk?.(v);
      if (opts?.okMsg) setOk(opts.okMsg);
      return v;
    } catch (e) {
      setError(errorMessage(e, t("account:common.genericError")));
      return undefined;
    } finally {
      setBusy(false);
    }
  }

  return {
    busy,
    error,
    ok,
    run,
    fail: (msg: string) => setError(msg),
    clear: () => (setError(null), setOk(null)),
  };
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

export function ToggleRow({
  label,
  hint,
  checked,
  onChange,
  disabled,
}: {
  label: string;
  hint?: ReactNode;
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex items-center gap-4 py-2.5">
      <div className="min-w-0 flex-1">
        <div className="text-[13.5px] font-semibold">{label}</div>
        {hint ? <div className="mt-0.5 text-[12px] text-muted">{hint}</div> : null}
      </div>
      <Toggle checked={checked} onChange={onChange} disabled={disabled} />
    </div>
  );
}

export function ExternalButton({ href, children }: { href: string; children: ReactNode }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-surface-2 px-3.5 py-2 text-[13px] font-semibold text-text transition-colors hover:border-accent hover:text-accent"
    >
      {children}
      <ExternalLink size={13} />
    </a>
  );
}

export function daysSince(iso?: string): number | null {
  if (!iso) return null;
  const ms = Date.now() - new Date(iso).getTime();
  if (Number.isNaN(ms)) return null;
  return Math.floor(ms / 86_400_000);
}

export function addDays(iso: string, days: number): string {
  const d = new Date(iso);
  d.setDate(d.getDate() + days);
  return d.toISOString();
}

export function lastChangedLabel(t: TFunc, iso?: string): string | null {
  const days = daysSince(iso);
  if (days === null) return null;
  if (days <= 0) return t("account:displayName.lastChanged.today");
  if (days === 1) return t("account:displayName.lastChanged.yesterday");
  return t("account:displayName.lastChanged.daysAgo", { count: days });
}
