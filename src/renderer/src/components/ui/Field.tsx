import type { InputHTMLAttributes, ReactNode } from "react";

export const INPUT_CLASS =
  "w-full rounded-sm border border-border bg-surface-2 px-3 py-2.5 text-text outline-none transition-[border-color,box-shadow,background] duration-[var(--dur)] ease-[var(--ease)] placeholder:text-faint focus:border-accent focus:bg-surface focus:shadow-[0_0_0_3px_var(--accent-weak)]";

export function Field({
  label,
  hint,
  className = "",
  ...rest
}: InputHTMLAttributes<HTMLInputElement> & { label: string; hint?: ReactNode }) {
  return (
    <label className="flex flex-col gap-[7px]">
      <span className="text-xs font-semibold text-muted">{label}</span>
      <input className={`${INPUT_CLASS} ${className}`} {...rest} />
      {hint ? <span className="text-[12.5px] text-muted">{hint}</span> : null}
    </label>
  );
}
