export function PresenceLabel({
  label,
  color,
  className,
}: {
  label: string;
  color: string;
  className?: string;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 text-[13px] font-semibold ${className ?? ""}`}
      style={{ color }}
    >
      <span className="size-2 rounded-full" style={{ background: color }} />
      {label}
    </span>
  );
}
