export function compactNumber(n: number): string {
  if (n < 1000) return `${n}`;
  if (n < 1_000_000) return `${(n / 1000).toFixed(n < 10_000 ? 1 : 0)}k`;
  return `${(n / 1_000_000).toFixed(1)}M`;
}

export function formatDate(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? iso
    : d.toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" });
}

export function formatDateTime(iso: string, locale?: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString(locale, {
    calendar: "gregory",
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function prettyTag(tag: string, prefix = ""): string {
  const label = tag.replace(new RegExp(`^${prefix}`), "").replace(/_/g, " ");
  return label.charAt(0).toUpperCase() + label.slice(1);
}

export function tagsWithPrefix(tags: readonly string[], prefix: string): string[] {
  return tags.filter((t) => t.startsWith(prefix));
}

export function prettyLink(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

export function platformLabel(p: string): string {
  if (p === "standalonewindows") return "PC (Windows)";
  if (p === "android") return "Quest / Android";
  if (p === "web") return "Web";
  return p;
}
