import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { TtlCache } from "../src/main/cache/cache";

const policy = { ttl: 1000, staleWhileRevalidate: 5000 };

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

describe("TtlCache.get — fresh vs miss", () => {
  it("calls the loader once and serves the cached value while fresh", async () => {
    const cache = new TtlCache();
    const loader = vi.fn().mockResolvedValue("v1");

    expect(await cache.get("k", policy, loader)).toBe("v1");
    expect(await cache.get("k", policy, loader)).toBe("v1");
    expect(loader).toHaveBeenCalledTimes(1);
    expect(cache.stats().hits).toBe(1);
    expect(cache.stats().misses).toBe(1);
  });
});

describe("TtlCache.get — single-flight de-dup", () => {
  it("shares one in-flight loader across concurrent gets of the same key", async () => {
    const cache = new TtlCache();
    let resolve!: (v: string) => void;
    const loader = vi.fn(() => new Promise<string>((r) => (resolve = r)));

    const a = cache.get("k", policy, loader);
    const b = cache.get("k", policy, loader);
    resolve("shared");

    expect(await a).toBe("shared");
    expect(await b).toBe("shared");
    expect(loader).toHaveBeenCalledTimes(1);
  });
});

describe("TtlCache.get — stale-while-revalidate", () => {
  it("returns the stale value and revalidates in the background past ttl", async () => {
    const cache = new TtlCache();
    const loader = vi.fn().mockResolvedValueOnce("v1").mockResolvedValueOnce("v2");

    expect(await cache.get("k", policy, loader)).toBe("v1");

    vi.setSystemTime(Date.now() + 2000);
    expect(await cache.get("k", policy, loader)).toBe("v1");
    await vi.waitFor(() => expect(loader).toHaveBeenCalledTimes(2));
    expect(await cache.get("k", policy, loader)).toBe("v2");
  });

  it("reloads synchronously once past the hard expiry", async () => {
    const cache = new TtlCache();
    const loader = vi.fn().mockResolvedValueOnce("v1").mockResolvedValueOnce("v2");

    expect(await cache.get("k", policy, loader)).toBe("v1");
    vi.setSystemTime(Date.now() + 7000);
    expect(await cache.get("k", policy, loader)).toBe("v2");
  });
});

describe("TtlCache.get — rate-limit backoff", () => {
  it("after a 429 loader failure, serves stale and suppresses revalidation", async () => {
    const cache = new TtlCache();
    const loader = vi
      .fn()
      .mockResolvedValueOnce("v1")
      .mockRejectedValueOnce({ status: 429, response: { headers: { "retry-after": "8" } } });

    expect(await cache.get("k", policy, loader)).toBe("v1");

    vi.setSystemTime(Date.now() + 2000);
    await cache.get("k", policy, loader);
    await vi.waitFor(() => expect(loader).toHaveBeenCalledTimes(2));

    await cache.get("k", policy, loader);
    expect(loader).toHaveBeenCalledTimes(2);
  });

  it("throws 429 on a cold miss while rate limited", async () => {
    const cache = new TtlCache();
    const failing = vi.fn().mockRejectedValue({ status: 429 });

    await expect(cache.get("a", policy, failing)).rejects.toMatchObject({ status: 429 });
    await expect(cache.get("b", policy, vi.fn())).rejects.toMatchObject({ status: 429 });
  });
});

describe("TtlCache.set / patch / invalidate / clear", () => {
  it("patch merges into an existing entry", async () => {
    const cache = new TtlCache();
    cache.set("k", { a: 1, b: 2 }, policy);
    cache.patch("k", { b: 3 });
    const val = await cache.get("k", policy, async () => ({ a: 0, b: 0 }));
    expect(val).toEqual({ a: 1, b: 3 });
  });

  it("patch is a no-op on a missing key", () => {
    const cache = new TtlCache();
    cache.patch("missing", { x: 1 });
    expect(cache.stats().entries).toBe(0);
  });

  it("invalidate forces the next get to reload", async () => {
    const cache = new TtlCache();
    const loader = vi.fn().mockResolvedValueOnce("v1").mockResolvedValueOnce("v2");
    await cache.get("k", policy, loader);
    cache.invalidate("k");
    expect(await cache.get("k", policy, loader)).toBe("v2");
  });

  it("clear empties the store", async () => {
    const cache = new TtlCache();
    cache.set("k", "v", policy);
    cache.clear();
    expect(cache.stats().entries).toBe(0);
  });
});

describe("TtlCache — LRU eviction", () => {
  it("evicts least-recently-accessed entries past maxEntries", async () => {
    const cache = new TtlCache(2);
    cache.set("a", 1, policy);
    vi.setSystemTime(Date.now() + 10);
    cache.set("b", 2, policy);
    vi.setSystemTime(Date.now() + 10);
    await cache.get("a", policy, async () => 1);
    vi.setSystemTime(Date.now() + 10);
    cache.set("c", 3, policy);

    expect(cache.stats().entries).toBe(2);
    const loader = vi.fn().mockResolvedValue(99);
    await cache.get("b", policy, loader);
    expect(loader).toHaveBeenCalledTimes(1);
  });
});
