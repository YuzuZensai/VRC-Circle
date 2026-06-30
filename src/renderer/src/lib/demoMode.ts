import type { UserProfile } from "../../../shared/types/user";

const GIVEN = [
  "Aoi",
  "Hana",
  "Haruka",
  "Hikari",
  "Kaede",
  "Koharu",
  "Mika",
  "Natsuki",
  "Ren",
  "Rin",
  "Sora",
  "Yui",
];
const FAMILY = [
  "Amamiya",
  "Fujimoto",
  "Hoshino",
  "Kisaragi",
  "Kobayashi",
  "Minazuki",
  "Mizuno",
  "Sakuraba",
  "Shirakawa",
  "Tachibana",
  "Tsukino",
  "Yamabuki",
];

function hashId(id: string): number {
  let hash = 2166136261;
  for (let i = 0; i < id.length; i++) {
    hash ^= id.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

export function demoName(id: string): string {
  const hash = hashId(id);
  return `${FAMILY[hash % FAMILY.length]} ${GIVEN[(hash >>> 4) % GIVEN.length]}`;
}

export function anonymizeUserForDemo(user: UserProfile): UserProfile {
  return {
    ...user,
    displayName: demoName(user.id),
    bio: "",
    bioLinks: [],
    statusDescription: "",
    userIcon: "",
    profilePicOverride: "",
    profilePicOverrideThumbnail: "",
    currentAvatarImageUrl: "",
    currentAvatarThumbnailImageUrl: "",
    location: user.location === "offline" ? "offline" : "private",
    note: undefined,
    pronouns: undefined,
    pastDisplayNames: [],
    badges: [],
  };
}
