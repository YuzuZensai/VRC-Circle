import { describe, it, expect } from "vitest";
import { fillSlots, normalizeVisibility, orderSlots } from "../src/main/vrchat/favoriteFolders";

const folder = (name: string) => ({ name });

describe("normalizeVisibility", () => {
  it("passes through known values and defaults the rest to private", () => {
    expect(normalizeVisibility("friends")).toBe("friends");
    expect(normalizeVisibility("public")).toBe("public");
    expect(normalizeVisibility("private")).toBe("private");
    expect(normalizeVisibility("whatever")).toBe("private");
  });
});

describe("orderSlots", () => {
  it("puts custom-named folders before numbered slots, slots sorted numerically", () => {
    const out = orderSlots(
      [folder("worlds10"), folder("cool stuff"), folder("worlds2"), folder("worlds1")],
      "worlds",
    );
    expect(out.map((f) => f.name)).toEqual(["cool stuff", "worlds1", "worlds2", "worlds10"]);
  });
});

describe("fillSlots", () => {
  it("pads with empty numbered slots up to the cap, skipping taken names", () => {
    const out = fillSlots([folder("worlds2")], "worlds", 3, folder);
    expect(out.map((f) => f.name)).toEqual(["worlds2", "worlds1", "worlds3"]);
  });

  it("does not pad past the cap when custom folders use up slots", () => {
    const out = fillSlots([folder("a"), folder("b")], "worlds", 2, folder);
    expect(out.map((f) => f.name)).toEqual(["a", "b"]);
  });
});
