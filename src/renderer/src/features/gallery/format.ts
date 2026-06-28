export { formatBytes } from "../../lib/format";

export function formatBucket(bucket: string, locale?: string): string {
  const m = /^(\d{4})-(\d{2})$/.exec(bucket);
  if (!m) return bucket;
  const d = new Date(Number(m[1]), Number(m[2]) - 1, 1);
  if (Number.isNaN(d.getTime())) return bucket;
  return d.toLocaleDateString(locale, { calendar: "gregory", year: "numeric", month: "long" });
}
