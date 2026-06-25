export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const units = ["KB", "MB", "GB"];
  let n = bytes / 1024;
  let i = 0;
  while (n >= 1024 && i < units.length - 1) {
    n /= 1024;
    i++;
  }
  return `${n.toFixed(n < 10 ? 1 : 0)} ${units[i]}`;
}

export function formatBucket(bucket: string, locale?: string): string {
  const m = /^(\d{4})-(\d{2})$/.exec(bucket);
  if (!m) return bucket;
  const d = new Date(Number(m[1]), Number(m[2]) - 1, 1);
  if (Number.isNaN(d.getTime())) return bucket;
  return d.toLocaleDateString(locale, { calendar: "gregory", year: "numeric", month: "long" });
}
