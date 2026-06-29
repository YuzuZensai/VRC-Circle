import type { ButtonHTMLAttributes } from "react";

const BASE =
  "inline-flex items-center justify-center gap-2 rounded-full px-[18px] py-2.5 text-sm font-semibold transition-[transform,background,border-color,box-shadow] duration-[var(--dur)] ease-[var(--ease)] disabled:cursor-not-allowed disabled:opacity-50 active:not-disabled:scale-[0.98]";

const VARIANT = {
  primary:
    "bg-accent text-on-accent hover:not-disabled:brightness-105 hover:not-disabled:shadow-[0_8px_20px_-10px_var(--accent)]",
  ghost:
    "border border-border bg-surface-2 text-text hover:not-disabled:border-border-strong hover:not-disabled:bg-surface-hover",
  danger:
    "bg-danger text-on-accent hover:not-disabled:brightness-105 hover:not-disabled:shadow-[0_8px_20px_-10px_var(--danger)]",
  link: "bg-transparent text-text hover:not-disabled:text-accent",
} as const;

export function Button({
  children,
  variant = "primary",
  loading,
  block,
  className = "",
  disabled,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: keyof typeof VARIANT;
  loading?: boolean;
  block?: boolean;
}) {
  return (
    <button
      className={`${BASE} ${VARIANT[variant]} ${block ? "w-full" : ""} ${className}`}
      {...rest}
      disabled={loading || disabled}
    >
      {loading ? (
        <span className="size-3.5 animate-[spin_0.7s_linear_infinite] rounded-full border-2 border-[color-mix(in_srgb,currentColor_35%,transparent)] border-t-current" />
      ) : null}
      <span className="inline-flex items-center gap-2">{children}</span>
    </button>
  );
}

export function IconButton({
  active,
  className = "",
  children,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { active?: boolean }) {
  return (
    <button
      className={`grid size-[38px] shrink-0 place-items-center rounded-sm border bg-surface-2 text-muted transition-[background,color,border-color] duration-[var(--dur)] ease-[var(--ease)] hover:bg-surface-hover hover:text-text ${
        active
          ? "border-[color-mix(in_srgb,var(--accent)_40%,var(--border))] text-accent"
          : "border-border hover:border-border-strong"
      } ${className}`}
      {...rest}
    >
      {children}
    </button>
  );
}
