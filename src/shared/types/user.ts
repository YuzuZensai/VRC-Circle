export type TrustRank =
  | "visitor"
  | "new"
  | "user"
  | "known"
  | "trusted"
  | "veteran"
  | "nuisance"
  | "troll";

export type UserStatus = "active" | "join me" | "ask me" | "busy" | "offline";

export type Platform = "standalonewindows" | "android" | "web" | "offline" | string;

export type Location = "offline" | "private" | "traveling" | "" | string;

export interface ParsedLocation {
  worldId: string;
  instanceId: string;
  instance: string;
  region?: string;
}

export function parseLocation(loc?: string): ParsedLocation | null {
  if (!loc || loc === "offline" || loc === "private" || loc === "traveling") return null;
  const [worldId, rest] = loc.split(":");
  if (!worldId?.startsWith("wrld_") || !rest) return null;
  const instanceId = rest.split("~")[0];
  const region = /~region\(([^)]+)\)/.exec(rest)?.[1];
  return { worldId, instanceId, instance: rest, region };
}

export interface Badge {
  id: string;
  name: string;
  description: string;
  imageUrl: string;
  showcased: boolean;
}

export interface UserProfile {
  id: string;
  displayName: string;
  bio: string;
  bioLinks: string[];
  statusDescription: string;
  status: UserStatus;
  trustRank: TrustRank;
  tags: string[];

  userIcon: string;
  profilePicOverride: string;
  profilePicOverrideThumbnail: string;
  currentAvatarId?: string;
  currentAvatarImageUrl: string;
  currentAvatarThumbnailImageUrl: string;
  currentAvatarTags: string[];

  location?: Location;
  lastPlatform?: Platform;
  lastLogin?: string;
  lastActivity?: string;
  state?: "online" | "active" | "offline";
  platform?: Platform;

  isFriend: boolean;
  friendKey?: string;

  developerType?: "none" | "trusted" | "internal" | "moderator" | string;
  ageVerificationStatus?: string;
  ageVerified?: boolean;
  pronouns?: string;
  languages?: string[];
  dateJoined?: string;
  pastDisplayNames?: { displayName: string; updatedAt?: string }[];
  note?: string;
  badges: Badge[];

  isSelf: boolean;
}

export interface SocialSnapshot {
  selfId: string | null;
  users: UserProfile[];
}
