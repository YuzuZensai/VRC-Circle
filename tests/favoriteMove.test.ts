import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  moveOneFavorite,
  moveManyFavorites,
  type FavoriteMover,
} from "../src/main/vrchat/favoriteMove";

interface Rec {
  id: string;
  favoriteId: string;
  tags: string[];
}

function mover(overrides: Partial<FavoriteMover<Rec>> = {}) {
  const m = {
    skip: vi.fn((rec: Rec | undefined, folder: string) => rec?.tags.includes(folder) ?? false),
    canRefavorite: vi.fn(async () => true),
    remove: vi.fn(async () => {}),
    add: vi.fn(async () => {}),
    restore: vi.fn(async () => {}),
    reload: vi.fn(async () => {}),
    onMoved: vi.fn(),
    ...overrides,
  };
  return m;
}

const rec = (id: string, tags: string[]): Rec => ({ id: `fav-${id}`, favoriteId: id, tags });

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

describe("moveOneFavorite", () => {
  it("moves: remove, add, reload, notify", async () => {
    const m = mover();
    const result = await moveOneFavorite(m, rec("w1", ["old"]), "w1", "new", true);
    expect(result).toEqual({ moved: 1, skipped: [] });
    expect(m.remove).toHaveBeenCalledOnce();
    expect(m.add).toHaveBeenCalledWith("w1", "new");
    expect(m.reload).toHaveBeenCalledOnce();
    expect(m.onMoved).toHaveBeenCalledWith("w1", "new");
  });

  it("no-ops when already in the folder", async () => {
    const m = mover();
    const result = await moveOneFavorite(m, rec("w1", ["new"]), "w1", "new", true);
    expect(result).toEqual({ moved: 0, skipped: [] });
    expect(m.remove).not.toHaveBeenCalled();
  });

  it("skips without removing when the item can't be re-favorited", async () => {
    const m = mover({ canRefavorite: vi.fn(async () => false) });
    const result = await moveOneFavorite(m, rec("w1", ["old"]), "w1", "new", true);
    expect(result).toEqual({ moved: 0, skipped: ["w1"] });
    expect(m.remove).not.toHaveBeenCalled();
  });

  it("restores the old favorite when add fails", async () => {
    const m = mover({ add: vi.fn(async () => Promise.reject({ status: 400 })) });
    const old = rec("w1", ["old"]);
    const result = await moveOneFavorite(m, old, "w1", "new", true);
    expect(result).toEqual({ moved: 0, skipped: ["w1"] });
    expect(m.restore).toHaveBeenCalledWith(old);
    expect(m.onMoved).not.toHaveBeenCalled();
  });

  it("rethrows transient failures after restoring", async () => {
    const m = mover({ add: vi.fn(async () => Promise.reject({ status: 429 })) });
    await expect(moveOneFavorite(m, rec("w1", ["old"]), "w1", "new", true)).rejects.toMatchObject({
      status: 429,
    });
    expect(m.restore).toHaveBeenCalledOnce();
  });
});

describe("moveManyFavorites", () => {
  it("moves everything movable and reports the rest as skipped", async () => {
    const m = mover({
      canRefavorite: vi.fn(async (id: string) => id !== "w3"),
    });
    const records = new Map([
      ["w1", rec("w1", ["old"])],
      ["w2", rec("w2", ["new"])],
      ["w3", rec("w3", ["old"])],
    ]);

    const done = moveManyFavorites(m, records, ["w1", "w2", "w3", "w4"], "new");
    await vi.runAllTimersAsync();
    const result = await done;

    expect(result).toEqual({ moved: 2, skipped: ["w3"] });
    expect(m.add).toHaveBeenCalledWith("w1", "new");
    expect(m.add).toHaveBeenCalledWith("w4", "new");
    expect(m.reload).toHaveBeenCalledOnce();
  });

  it("aborts on a transient failure after restoring the current item", async () => {
    const m = mover({
      add: vi.fn(async (id: string) => {
        if (id === "w2") throw { status: 500 };
      }),
    });
    const records = new Map([
      ["w1", rec("w1", ["old"])],
      ["w2", rec("w2", ["old"])],
    ]);

    const done = moveManyFavorites(m, records, ["w1", "w2"], "new");
    done.catch(() => {});
    await vi.runAllTimersAsync();

    await expect(done).rejects.toMatchObject({ status: 500 });
    expect(m.restore).toHaveBeenCalledWith(records.get("w2"));
    expect(m.reload).toHaveBeenCalledOnce();
  });
});
