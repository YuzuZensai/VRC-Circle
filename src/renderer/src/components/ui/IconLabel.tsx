export function IconLabel({
  icon,
  children,
  gap = "gap-1",
  title,
  className = "",
  style,
}: {
  icon: React.ReactNode;
  children: React.ReactNode;
  gap?: string;
  title?: string;
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <span className={`inline-flex items-center ${gap} ${className}`} title={title} style={style}>
      {icon}
      {children}
    </span>
  );
}
