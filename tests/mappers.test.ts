import { describe, it, expect } from "vitest";
import {
  trustRankFromTags,
  toIso,
  toUserProfile,
  toWorld,
  toAvatar,
} from "../src/main/vrchat/mappers";

describe("trustRankFromTags", () => {
  it("maps each trust tag to the rank one level below its label", () => {
    expect(trustRankFromTags([])).toBe("visitor");
    expect(trustRankFromTags(["system_trust_basic"])).toBe("new");
    expect(trustRankFromTags(["system_trust_known"])).toBe("user");
    expect(trustRankFromTags(["system_trust_trusted"])).toBe("known");
    expect(trustRankFromTags(["system_trust_veteran"])).toBe("trusted");
    expect(trustRankFromTags(["system_trust_legend"])).toBe("veteran");
  });

  it("defaults to visitor when no trust tag present", () => {
    expect(trustRankFromTags(["language_eng", "something_else"])).toBe("visitor");
    expect(trustRankFromTags()).toBe("visitor");
  });

  it("picks the highest rank when several trust tags are present", () => {
    expect(trustRankFromTags(["system_trust_basic", "system_trust_legend"])).toBe("veteran");
  });

  it("troll tags override everything", () => {
    expect(trustRankFromTags(["system_trust_legend", "system_troll"])).toBe("troll");
    expect(trustRankFromTags(["system_probable_troll"])).toBe("troll");
  });
});

describe("toIso", () => {
  it("returns undefined for empty/null values", () => {
    expect(toIso(undefined)).toBeUndefined();
    expect(toIso(null)).toBeUndefined();
    expect(toIso("")).toBeUndefined();
  });

  it("passes Date objects through to ISO", () => {
    const d = new Date("2024-01-02T03:04:05.000Z");
    expect(toIso(d)).toBe("2024-01-02T03:04:05.000Z");
  });

  it("normalizes parseable date strings to ISO", () => {
    expect(toIso("2024-01-02T03:04:05Z")).toBe("2024-01-02T03:04:05.000Z");
  });

  it("returns undefined for unparseable strings", () => {
    expect(toIso("not a date")).toBeUndefined();
  });
});

describe("toUserProfile", () => {
  const base = { id: "usr_1", displayName: "Alice" };

  it("fills defaults for missing fields", () => {
    const p = toUserProfile({ ...base }, "self");
    expect(p.bio).toBe("");
    expect(p.tags).toEqual([]);
    expect(p.badges).toEqual([]);
    expect(p.isFriend).toBe(false);
    expect(p.status).toBe("offline");
    expect(p.trustRank).toBe("visitor");
  });

  it("sets isSelf when the id matches selfId", () => {
    expect(toUserProfile({ ...base, id: "self" }, "self").isSelf).toBe(true);
    expect(toUserProfile({ ...base, id: "other" }, "self").isSelf).toBe(false);
  });

  it("accepts both camelCase and snake_case timestamp aliases", () => {
    const camel = toUserProfile({ ...base, lastLogin: "2024-01-01T00:00:00Z" }, "self");
    const snake = toUserProfile({ ...base, last_login: "2024-01-01T00:00:00Z" }, "self");
    expect(camel.lastLogin).toBe("2024-01-01T00:00:00.000Z");
    expect(snake.lastLogin).toBe("2024-01-01T00:00:00.000Z");
  });

  it("extracts languages from language_ tags", () => {
    const p = toUserProfile(
      { ...base, tags: ["language_eng", "language_jpn", "system_trust_known"] },
      "self",
    );
    expect(p.languages).toEqual(["eng", "jpn"]);
  });

  it("normalizes an unknown status to offline", () => {
    expect(toUserProfile({ ...base, status: "bogus" }, "self").status).toBe("offline");
    expect(toUserProfile({ ...base, status: "join me" }, "self").status).toBe("join me");
  });

  it("blanks a falsy note to undefined", () => {
    expect(toUserProfile({ ...base, note: "" }, "self").note).toBeUndefined();
    expect(toUserProfile({ ...base, note: "hi" }, "self").note).toBe("hi");
  });
});

describe("toWorld", () => {
  const base = { id: "wrld_1", authorId: "usr_1" };

  it("blanks vrchat's '???' placeholder for hidden name/author", () => {
    const w = toWorld({ ...base, name: "???", authorName: "???" } as never);
    expect(w.name).toBe("");
    expect(w.authorName).toBe("");
  });

  it("marks a world detailed only when it carries visit counts", () => {
    expect(toWorld({ ...base, name: "W", visits: 10 } as never).detailed).toBe(true);
    expect(toWorld({ ...base, name: "W" } as never).detailed).toBe(false);
  });

  it("derives platforms from unity packages", () => {
    const w = toWorld({
      ...base,
      name: "W",
      unityPackages: [{ platform: "standalonewindows" }, { platform: "android" }],
    } as never);
    expect(w.platforms).toEqual({ pc: true, android: true });
  });

  it("defaults releaseStatus to private", () => {
    expect(toWorld({ ...base, name: "W" } as never).releaseStatus).toBe("private");
  });
});

describe("toAvatar", () => {
  const base = { id: "avtr_1", name: "Av" };

  it("treats a 'None' performance rating as no build for that platform", () => {
    const a = toAvatar({
      ...base,
      performance: { standalonewindows: "Excellent", android: "None" },
    });
    expect(a.platforms).toEqual({ pc: true, android: false });
    expect(a.performance.pc).toBe("Excellent");
    expect(a.performance.android).toBeUndefined();
  });

  it("defaults releaseStatus and empty collections", () => {
    const a = toAvatar({ ...base });
    expect(a.releaseStatus).toBe("private");
    expect(a.tags).toEqual([]);
    expect(a.favorites).toBe(0);
  });
});
