function initials(name?: string): string {
  return (name ?? "?").trim().slice(0, 2).toUpperCase() || "?";
}

export function Avatar({
  src,
  name,
  size = 30,
  className = "",
}: {
  src?: string;
  name?: string;
  size?: number;
  className?: string;
}) {
  const style = { width: size, height: size, borderRadius: "50%" };
  return src ? (
    <img src={src} alt="" style={style} className={`shrink-0 object-cover ${className}`} />
  ) : (
    <span
      style={style}
      className={`avatar-fallback grid shrink-0 place-items-center bg-surface-hover font-semibold uppercase text-muted ${className}`}
    >
      {initials(name)}
    </span>
  );
}
