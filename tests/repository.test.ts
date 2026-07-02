import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { Repository } from "../src/main/store/repository/repository";
import type { StorageBackend } from "../src/main/store/repository/backend";
import type { StoredEntity } from "../src/shared/types/repository";
import type { FieldPolicy } from "../src/main/store/repository/fieldPolicy";

interface Thing {
  id: string;
  name: string;
  bio?: string;
  occupants?: number;
}

function memoryBackend<T>(): StorageBackend<T> {
  const map = new Map<string, StoredEntity<T>>();
  return {
    load: () => new Map(map),
    put: (id, e) => void map.set(id, e),
    remove: (id) => void map.delete(id),
    flush: () => {},
    clear: () => map.clear(),
    file: null,
  };
}

const policy: FieldPolicy<Thing> = {
  classOf: (f) => (f === "occupants" || f === "bio" ? "live" : "identity"),
  maxAge: { identity: 60_000, stat: 60_000, live: 1000 },
  keepNonEmpty: new Set(["bio"]),
};

function makeRepo() {
  return new Repository<Thing>({ name: "things", policy, backend: memoryBackend() });
}

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

describe("Repository.upsert — source priority on live fields", () => {
  it("a lower-priority source cannot overwrite a live field set by ws", () => {
    const repo = makeRepo();
    repo.upsert({ id: "a", name: "A", occupants: 5 }, "ws");
    vi.advanceTimersByTime(10);
    repo.upsert({ id: "a", occupants: 1 }, "rest:list");
    expect(repo.get("a")?.occupants).toBe(5);
  });

  it("equal-priority live writes apply when newer", () => {
    const repo = makeRepo();
    repo.upsert({ id: "a", name: "A", occupants: 5 }, "ws");
    vi.advanceTimersByTime(10);
    repo.upsert({ id: "a", occupants: 9 }, "ws");
    expect(repo.get("a")?.occupants).toBe(9);
  });
});

describe("Repository.upsert — timestamp ordering", () => {
  it("ignores writes older than the stored field", () => {
    const repo = makeRepo();
    const now = Date.now();
    repo.upsert({ id: "a", name: "new" }, "rest:detail", now);
    repo.upsert({ id: "a", name: "old" }, "rest:detail", now - 1000);
    expect(repo.get("a")?.name).toBe("new");
  });
});

describe("Repository.upsert — empty-value guards", () => {
  it("an empty identity value never wipes a resolved one", () => {
    const repo = makeRepo();
    repo.upsert({ id: "a", name: "Resolved" }, "rest:detail");
    vi.advanceTimersByTime(10);
    repo.upsert({ id: "a", name: "" }, "rest:detail");
    expect(repo.get("a")?.name).toBe("Resolved");
  });

  it("keepNonEmpty fields survive empty writes from lower-priority sources", () => {
    const repo = makeRepo();
    repo.upsert({ id: "a", name: "A", bio: "hello" }, "rest:detail");
    vi.advanceTimersByTime(10);
    repo.upsert({ id: "a", bio: "" }, "rest:list");
    expect(repo.get("a")?.bio).toBe("hello");
  });

  it("a rest:detail read may clear a keepNonEmpty field", () => {
    const repo = makeRepo();
    repo.upsert({ id: "a", name: "A", bio: "hello" }, "rest:detail");
    vi.advanceTimersByTime(10);
    repo.upsert({ id: "a", bio: "" }, "rest:detail");
    expect(repo.get("a")?.bio).toBe("");
  });
});

describe("Repository.upsert — change notification", () => {
  it("emits on real changes and stays silent on no-op writes", () => {
    const repo = makeRepo();
    const seen = vi.fn();
    repo.onChange(seen);

    repo.upsert({ id: "a", name: "A" }, "rest:detail");
    expect(seen).toHaveBeenCalledTimes(1);

    vi.advanceTimersByTime(10);
    repo.upsert({ id: "a", name: "" }, "rest:detail");
    expect(seen).toHaveBeenCalledTimes(1);
  });
});

describe("Repository.isStale", () => {
  it("reports live fields stale after their max age and identity fields fresh", () => {
    const repo = makeRepo();
    repo.upsert({ id: "a", name: "A", occupants: 3 }, "ws");
    vi.advanceTimersByTime(2000);
    expect(repo.isStale("a", "occupants")).toBe(true);
    expect(repo.isStale("a", "name")).toBe(false);
  });
});
