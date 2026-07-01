import { describe, it, expect } from "vitest";
import {
  isOnline,
  locationLabel,
  presenceOf,
  avatarOf,
  bannerOf,
  regionFlag,
  languageLabel,
} from "../src/renderer/src/lib/vrchat";

describe("isOnline", () => {
  it("counts self as always online", () => {
    expect(isOnline({ isSelf: true, state: "offline" })).toBe(true);
  });

  it("counts online/active state as online", () => {
    expect(isOnline({ state: "online" })).toBe(true);
    expect(isOnline({ state: "active" })).toBe(true);
  });

  it("counts a real location as online even without state", () => {
    expect(isOnline({ location: "wrld_1:12345" })).toBe(true);
  });

  it("treats the 'offline' location sentinel and empty location as offline", () => {
    expect(isOnline({ state: "offline", location: "offline" })).toBe(false);
    expect(isOnline({ state: "offline" })).toBe(false);
  });
});

describe("locationLabel", () => {
  it("returns undefined for null/empty/offline sentinels", () => {
    expect(locationLabel(undefined)).toBeUndefined();
    expect(locationLabel("")).toBeUndefined();
    expect(locationLabel("offline")).toBeUndefined();
  });

  it("labels the private and traveling sentinels", () => {
    expect(locationLabel("private")).toBe("In a private world");
    expect(locationLabel("traveling")).toBe("Traveling…");
  });

  it("labels a real location generically", () => {
    expect(locationLabel("wrld_1:12345~region(us)")).toBe("In a world");
  });
});

describe("presenceOf", () => {
  it("shows the real status color when online", () => {
    const p = presenceOf({ status: "join me", state: "online" });
    expect(p.online).toBe(true);
    expect(p.effective.label).toBe("Join Me");
  });

  it("falls back to the offline swatch when offline, keeping the raw status", () => {
    const p = presenceOf({ status: "join me", state: "offline" });
    expect(p.online).toBe(false);
    expect(p.effective.label).toBe("Offline");
    expect(p.status.label).toBe("Join Me");
  });
});

describe("avatar/banner fallback chains", () => {
  it("prefers userIcon, then thumbnail, then full image", () => {
    expect(
      avatarOf({
        userIcon: "icon",
        currentAvatarThumbnailImageUrl: "thumb",
        currentAvatarImageUrl: "full",
      }),
    ).toBe("icon");
    expect(
      avatarOf({
        userIcon: "",
        currentAvatarThumbnailImageUrl: "thumb",
        currentAvatarImageUrl: "full",
      }),
    ).toBe("thumb");
    expect(
      avatarOf({ userIcon: "", currentAvatarThumbnailImageUrl: "", currentAvatarImageUrl: "full" }),
    ).toBe("full");
  });

  it("banner prefers the profile override, then full image", () => {
    expect(
      bannerOf({
        profilePicOverride: "ovr",
        currentAvatarImageUrl: "full",
        currentAvatarThumbnailImageUrl: "thumb",
      }),
    ).toBe("ovr");
    expect(
      bannerOf({
        profilePicOverride: "",
        currentAvatarImageUrl: "full",
        currentAvatarThumbnailImageUrl: "thumb",
      }),
    ).toBe("full");
  });
});

describe("regionFlag / languageLabel", () => {
  it("maps known regions case-insensitively and unknown to undefined", () => {
    expect(regionFlag("US")).toBe("🇺🇸");
    expect(regionFlag("jp")).toBe("🇯🇵");
    expect(regionFlag("xx")).toBeUndefined();
    expect(regionFlag(undefined)).toBeUndefined();
  });

  it("maps known language codes and falls back to uppercased code", () => {
    expect(languageLabel("eng")).toBe("English");
    expect(languageLabel("zzz")).toBe("ZZZ");
  });
});
