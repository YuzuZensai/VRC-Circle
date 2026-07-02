export interface HttpLike {
  status?: number;
  statusCode?: number;
  status_code?: number;
  response?: { status?: number; headers?: Record<string, string> };
  headers?: Record<string, string>;
  message?: string;
  error?: { status_code?: number; statusCode?: number; status?: number };
}

export function httpStatusOf(err: unknown): number | undefined {
  const e = (err ?? {}) as HttpLike;
  return (
    e.status ??
    e.statusCode ??
    e.status_code ??
    e.response?.status ??
    e.error?.status_code ??
    e.error?.statusCode ??
    e.error?.status
  );
}

export function retryAfterSecondsOf(err: unknown): number | undefined {
  const e = (err ?? {}) as HttpLike;
  const raw = e.response?.headers?.["retry-after"] ?? e.headers?.["retry-after"];
  const n = raw != null ? Number(raw) : NaN;
  return Number.isFinite(n) ? n : undefined;
}

export function rateLimitDelayMs(err: unknown): number | null {
  if (httpStatusOf(err) !== 429) return null;
  const secs = retryAfterSecondsOf(err);
  return secs !== undefined ? secs * 1000 : 8000;
}
