import { describe, it, expect } from "vitest";
import { httpStatusOf, isTransientError, toApiError } from "../src/main/vrchat/errors";

describe("httpStatusOf", () => {
  it("reads status from the many shapes vrchat/SDK errors take", () => {
    expect(httpStatusOf({ status: 404 })).toBe(404);
    expect(httpStatusOf({ statusCode: 401 })).toBe(401);
    expect(httpStatusOf({ status_code: 500 })).toBe(500);
    expect(httpStatusOf({ response: { status: 429 } })).toBe(429);
    expect(httpStatusOf({ error: { status_code: 403 } })).toBe(403);
  });

  it("returns undefined for a shapeless error", () => {
    expect(httpStatusOf(null)).toBeUndefined();
    expect(httpStatusOf({})).toBeUndefined();
    expect(httpStatusOf("boom")).toBeUndefined();
  });
});

describe("isTransientError", () => {
  it("treats 429 and 5xx as transient", () => {
    expect(isTransientError({ status: 429 })).toBe(true);
    expect(isTransientError({ status: 500 })).toBe(true);
    expect(isTransientError({ status: 503 })).toBe(true);
  });

  it("treats 4xx (other than 429) as permanent", () => {
    expect(isTransientError({ status: 404 })).toBe(false);
    expect(isTransientError({ status: 401 })).toBe(false);
  });

  it("treats a status-less error (network failure) as transient", () => {
    expect(isTransientError(new Error("ECONNRESET"))).toBe(true);
  });
});

describe("toApiError", () => {
  it("maps well-known statuses to codes", () => {
    expect(toApiError({ status: 401 }).code).toBe("unauthorized");
    expect(toApiError({ status: 404 }).code).toBe("not_found");
    expect(toApiError({ status: 429 }).code).toBe("rate_limited");
  });

  it("classifies status-less network-ish messages as network", () => {
    expect(toApiError({ message: "fetch failed: ENOTFOUND" }).code).toBe("network");
  });

  it("passes through a pre-coded error and its 2FA methods", () => {
    const e = toApiError({ code: "two_factor_required", methods: ["totp"] });
    expect(e.code).toBe("two_factor_required");
    expect(e.methods).toEqual(["totp"]);
  });

  it("uses a friendly rate-limit message and parses retry-after", () => {
    const e = toApiError({ status: 429, response: { headers: { "retry-after": "12" } } });
    expect(e.code).toBe("rate_limited");
    expect(e.retryAfter).toBe(12);
    expect(e.message).toMatch(/rate limit/i);
  });

  it("gives a temporary-unavailable message for 5xx", () => {
    expect(toApiError({ status: 502 }).message).toMatch(/temporarily unavailable/i);
  });

  it("falls back to unknown with the original message", () => {
    const e = toApiError({ message: "weird" });
    expect(e.code).toBe("unknown");
    expect(e.message).toBe("weird");
  });
});
