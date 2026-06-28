export function CardGrid({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <div className={`grid grid-cols-2 gap-3 sm:grid-cols-3 ${className}`}>{children}</div>;
}
