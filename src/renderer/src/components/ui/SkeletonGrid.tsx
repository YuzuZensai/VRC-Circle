export function SkeletonGrid({
  count,
  grid = "grid grid-cols-2 gap-3 sm:grid-cols-3",
  item = "sk aspect-video rounded-lg",
}: {
  count: number;
  grid?: string;
  item?: string;
}) {
  return (
    <div className={grid}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className={item} />
      ))}
    </div>
  );
}
