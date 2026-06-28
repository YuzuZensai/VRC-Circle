import type { ButtonHTMLAttributes } from "react";

const BASE =
  "group block w-full overflow-hidden rounded-lg border border-border bg-surface text-left transition-colors";

export function Card({
  className = "",
  interactive = true,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { interactive?: boolean }) {
  return (
    <button
      className={`${BASE} ${interactive ? "hover:border-accent" : ""} ${className}`}
      {...props}
    />
  );
}
