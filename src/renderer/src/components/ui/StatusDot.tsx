import type { HTMLAttributes } from "react";

export function StatusDot({
  color,
  size = 11,
  ring,
  className = "",
  ...rest
}: { color: string; size?: number; ring?: string } & HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      className={`block rounded-full ${className}`}
      style={{
        width: size,
        height: size,
        background: color,
        border: ring ? `2px solid ${ring}` : undefined,
      }}
      {...rest}
    />
  );
}
