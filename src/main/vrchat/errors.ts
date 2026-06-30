import type { ApiError, ApiErrorCode, IpcResult } from "../../shared/types/result";

interface HttpLike {
  status?: number;
  statusCode?: number;
  status_code?: number;
  response?: { status?: number; headers?: Record<string, string> };
  headers?: Record<string, string>;
  message?: string;
  code?: ApiErrorCode;
  methods?: ("totp" | "emailOtp")[];
  error?: { status_code?: number; statusCode?: number; status?: number };
}

function statusOf(e: HttpLike): number | undefined {
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

export function httpStatusOf(err: unknown): number | undefined {
  return statusOf((err ?? {}) as HttpLike);
}

export function isTransientError(err: unknown): boolean {
  const status = httpStatusOf(err);
  if (status === undefined) return true;
  return status === 429 || status >= 500;
}

function retryAfterOf(e: HttpLike): number | undefined {
  const raw = e.response?.headers?.["retry-after"] ?? e.headers?.["retry-after"];
  const n = raw != null ? Number(raw) : NaN;
  return Number.isFinite(n) ? n : undefined;
}

export function toApiError(err: unknown): ApiError {
  const e = (err ?? {}) as HttpLike;
  const status = statusOf(e);
  const message = e.message ?? "Unexpected error";

  if (e.code) return { code: e.code, message, methods: e.methods };

  let code: ApiErrorCode = "unknown";
  if (status === 401) code = "unauthorized";
  else if (status === 404) code = "not_found";
  else if (status === 429) code = "rate_limited";
  else if (status === undefined && /network|fetch|ENOTFOUND|ECONN/i.test(message)) code = "network";

  if (status === 429) {
    return {
      code,
      message: "VRChat API rate limit hit. Try again shortly.",
      retryAfter: retryAfterOf(e),
    };
  }
  if (status !== undefined && status >= 500) {
    return { code, message: "VRChat API is temporarily unavailable. Try again shortly." };
  }

  return { code, message, retryAfter: retryAfterOf(e) };
}

export async function guard<T>(fn: () => Promise<T>): Promise<IpcResult<T>> {
  try {
    return { ok: true, data: await fn() };
  } catch (err) {
    return { ok: false, error: toApiError(err) };
  }
}
