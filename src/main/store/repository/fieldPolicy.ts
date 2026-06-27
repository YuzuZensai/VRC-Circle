import type { FieldSource } from "../../../shared/types/repository";

export type FieldClass = "identity" | "stat" | "live";

export interface FieldPolicy<T> {
  classOf: (field: keyof T & string) => FieldClass;
  maxAge: Record<FieldClass, number>;
  keepNonEmpty?: ReadonlySet<keyof T & string>;
}

const SOURCE_PRIORITY: Record<FieldSource, number> = {
  seed: 0,
  "rest:search": 1,
  "rest:list": 2,
  "rest:detail": 3,
  ws: 4,
};

export function sourcePriority(src: FieldSource): number {
  return SOURCE_PRIORITY[src] ?? 0;
}

const MIN = 60_000;
const HOUR = 60 * MIN;
const DAY = 24 * HOUR;

function table<T>(
  classes: Partial<Record<keyof T & string, FieldClass>>,
  maxAge: Record<FieldClass, number>,
  keepNonEmpty?: ReadonlySet<keyof T & string>,
): FieldPolicy<T> {
  return {
    classOf: (f) => classes[f] ?? "identity",
    maxAge,
    keepNonEmpty,
  };
}

export const worldFieldPolicy = table<import("../../../shared/types/world").World>(
  {
    occupants: "live",
    publicOccupants: "live",
    privateOccupants: "live",
    heat: "live",
    favorites: "stat",
    visits: "stat",
    popularity: "stat",
  },
  { identity: 30 * DAY, stat: 6 * HOUR, live: 2 * MIN },
);

export const WS_STRING_FIELDS = [
  "displayName",
  "bio",
  "userIcon",
  "profilePicOverride",
  "currentAvatarThumbnailImageUrl",
  "location",
] as const satisfies readonly (keyof import("../../../shared/types/user").UserProfile)[];

export const userFieldPolicy = table<import("../../../shared/types/user").UserProfile>(
  {
    status: "live",
    statusDescription: "live",
    state: "live",
    location: "live",
    displayName: "live",
    bio: "live",
    userIcon: "live",
    profilePicOverride: "live",
    currentAvatarThumbnailImageUrl: "live",
    tags: "live",
    trustRank: "live",
  },
  { identity: 30 * DAY, stat: 6 * HOUR, live: 1 * MIN },
  new Set(["statusDescription", "userIcon", "profilePicOverride", "bio"]),
);

export const avatarFieldPolicy = table<import("../../../shared/types/avatar").Avatar>(
  {
    favorites: "stat",
  },
  { identity: 30 * DAY, stat: 6 * HOUR, live: 1 * MIN },
);

export const groupFieldPolicy = table<import("../../../shared/types/group").Group>(
  {
    memberCount: "stat",
    onlineMemberCount: "live",
  },
  { identity: 30 * DAY, stat: 6 * HOUR, live: 2 * MIN },
);
