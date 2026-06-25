export type ApiErrorCode =
  | "unauthorized"
  | "requires_2fa"
  | "invalid_2fa"
  | "rate_limited"
  | "not_found"
  | "network"
  | "unknown";

export interface ApiError {
  code: ApiErrorCode;
  message: string;
  retryAfter?: number;
  methods?: ("totp" | "emailOtp")[];
}

export type IpcResult<T> = { ok: true; data: T } | { ok: false; error: ApiError };
