import type {
  World as SdkWorld,
  LimitedWorld,
  FavoritedWorld,
  LimitedUserGroups,
  RepresentedGroup,
  Group as SdkGroup,
  User,
  CurrentUser,
  LimitedUserFriend,
} from "vrchat";
import type { TrustRank, UserProfile, UserStatus } from "../../shared/types/user";
import type { CurrentUserSummary } from "../../shared/types/auth";
import type { ReleaseStatus, World, WorldPlatforms } from "../../shared/types/world";
import type { Avatar } from "../../shared/types/avatar";
import type { Group } from "../../shared/types/group";

interface RawUser {
  id: string;
  displayName: string;
  bio?: string;
  bioLinks?: string[];
  statusDescription?: string;
  status?: string;
  tags?: string[];
  userIcon?: string;
  profilePicOverride?: string;
  profilePicOverrideThumbnail?: string;
  currentAvatarImageUrl?: string;
  currentAvatarThumbnailImageUrl?: string;
  currentAvatarTags?: string[];
  location?: string;
  lastPlatform?: string;
  last_platform?: string;
  lastLogin?: string;
  last_login?: string | Date | null;
  lastActivity?: string;
  last_activity?: string | Date | null;
  state?: string;
  platform?: string;
  isFriend?: boolean;
  friendKey?: string;
  developerType?: string;
  ageVerificationStatus?: string;
  ageVerified?: boolean;
  pronouns?: string;
  date_joined?: string | Date;
  dateJoined?: string;
  note?: string;
  pastDisplayNames?: { displayName: string; updated_at?: string | Date }[];
  badges?: {
    badgeId: string;
    badgeName: string;
    badgeDescription: string;
    badgeImageUrl: string;
    showcased?: boolean;
  }[];
}

type Mappable = Omit<User | CurrentUser | LimitedUserFriend, "last_login" | "last_activity">;
const _rawUserCheck = (u: Mappable & { id: string; displayName: string }): RawUser => u;
void _rawUserCheck;

// VRChat's trust tag names lag behind the labels shown in-app.
export function trustRankFromTags(tags: string[] = []): TrustRank {
  const has = (t: string) => tags.includes(`system_trust_${t}`);
  if (tags.includes("system_troll") || tags.includes("system_probable_troll")) return "troll";
  if (has("legend")) return "veteran";
  if (has("veteran")) return "trusted";
  if (has("trusted")) return "known";
  if (has("known")) return "user";
  if (has("basic")) return "new";
  return "visitor";
}

function languagesFromTags(tags: string[] = []): string[] {
  return tags.filter((t) => t.startsWith("language_")).map((t) => t.slice("language_".length));
}

function normalizeStatus(status?: string): UserStatus {
  switch (status) {
    case "join me":
    case "active":
    case "ask me":
    case "busy":
    case "offline":
      return status;
    default:
      return "offline";
  }
}

function toIso(v?: string | Date | null): string | undefined {
  if (!v) return undefined;
  const s = v instanceof Date ? v.toISOString() : v;
  return s === "" ? undefined : s;
}

export function toUserProfile(raw: RawUser, selfId: string): UserProfile {
  const tags = raw.tags ?? [];
  return {
    id: raw.id,
    displayName: raw.displayName,
    bio: raw.bio ?? "",
    bioLinks: raw.bioLinks ?? [],
    statusDescription: raw.statusDescription ?? "",
    status: normalizeStatus(raw.status),
    trustRank: trustRankFromTags(tags),
    tags,

    userIcon: raw.userIcon ?? "",
    profilePicOverride: raw.profilePicOverride ?? "",
    profilePicOverrideThumbnail: raw.profilePicOverrideThumbnail ?? "",
    currentAvatarImageUrl: raw.currentAvatarImageUrl ?? "",
    currentAvatarThumbnailImageUrl: raw.currentAvatarThumbnailImageUrl ?? "",
    currentAvatarTags: raw.currentAvatarTags ?? [],

    location: raw.location,
    lastPlatform: raw.lastPlatform ?? raw.last_platform,
    lastLogin: toIso(raw.lastLogin ?? raw.last_login),
    lastActivity: toIso(raw.lastActivity ?? raw.last_activity),
    state: raw.state as UserProfile["state"],
    platform: raw.platform,

    isFriend: raw.isFriend ?? false,
    friendKey: raw.friendKey,

    developerType: raw.developerType,
    ageVerificationStatus: raw.ageVerificationStatus,
    ageVerified: raw.ageVerified,
    pronouns: raw.pronouns,
    languages: languagesFromTags(tags),
    dateJoined: raw.dateJoined ?? toIso(raw.date_joined),
    pastDisplayNames: raw.pastDisplayNames?.map((p) => ({
      displayName: p.displayName,
      updatedAt: toIso(p.updated_at),
    })),
    note: raw.note || undefined,
    badges:
      raw.badges?.map((b) => ({
        id: b.badgeId,
        name: b.badgeName,
        description: b.badgeDescription,
        imageUrl: b.badgeImageUrl,
        showcased: b.showcased ?? false,
      })) ?? [],

    isSelf: raw.id === selfId,
  };
}

export function toCurrentUserSummary(raw: RawUser): CurrentUserSummary {
  return {
    id: raw.id,
    displayName: raw.displayName,
    userIcon: raw.userIcon ?? "",
    currentAvatarThumbnailImageUrl: raw.currentAvatarThumbnailImageUrl ?? "",
  };
}

type RawWorld = SdkWorld | LimitedWorld | FavoritedWorld;

export function toWorld(raw: RawWorld): World {
  const platforms = raw.unityPackages ? platformsOf(raw.unityPackages) : undefined;
  const detailed = "visits" in raw;
  return {
    id: raw.id,
    detailed,
    name: raw.name,
    authorId: raw.authorId ?? "",
    authorName: raw.authorName,
    description: "description" in raw ? (raw.description ?? "") : "",
    imageUrl: raw.imageUrl ?? "",
    thumbnailImageUrl: raw.thumbnailImageUrl ?? "",
    releaseStatus: (raw.releaseStatus as ReleaseStatus) ?? "private",
    capacity: raw.capacity ?? 0,
    favorites: raw.favorites ?? 0,
    visits: "visits" in raw ? (raw.visits ?? 0) : 0,
    occupants: raw.occupants ?? 0,
    heat: raw.heat ?? 0,
    tags: raw.tags ?? [],
    createdAt: toIso(raw.created_at),
    updatedAt: toIso(raw.updated_at),

    recommendedCapacity: raw.recommendedCapacity,
    popularity: raw.popularity,
    version: "version" in raw ? raw.version : undefined,
    publishedAt: validDate(raw.publicationDate),
    labsPublishedAt: validDate(raw.labsPublicationDate),
    previewYoutubeId: raw.previewYoutubeId ?? undefined,
    platforms,
    publicOccupants: "publicOccupants" in raw ? raw.publicOccupants : undefined,
    privateOccupants: "privateOccupants" in raw ? raw.privateOccupants : undefined,
  };
}

export function toGroup(raw: LimitedUserGroups | RepresentedGroup): Group {
  return {
    id: raw.groupId ?? "",
    name: raw.name ?? "",
    shortCode: raw.shortCode ?? undefined,
    description: raw.description || undefined,
    iconUrl: raw.iconUrl ?? undefined,
    bannerUrl: raw.bannerUrl ?? undefined,
    ownerId: raw.ownerId ?? undefined,
    memberCount: raw.memberCount,
    privacy: raw.privacy ?? undefined,
    isRepresenting: raw.isRepresenting ?? undefined,
  };
}

export function toGroupDetail(raw: SdkGroup): Group {
  return {
    id: raw.id ?? "",
    detailed: true,
    name: raw.name ?? "",
    shortCode: raw.shortCode ?? undefined,
    description: raw.description || undefined,
    iconUrl: raw.iconUrl ?? undefined,
    bannerUrl: raw.bannerUrl ?? undefined,
    ownerId: raw.ownerId ?? undefined,
    memberCount: raw.memberCount,
    privacy: raw.privacy ?? undefined,
    onlineMemberCount: raw.onlineMemberCount,
    joinState: raw.joinState ?? undefined,
    isVerified: raw.isVerified ?? undefined,
    rules: raw.rules || undefined,
    languages: raw.languages ?? undefined,
    links: raw.links ?? undefined,
    tags: raw.tags ?? undefined,
    createdAt: toIso(raw.createdAt as unknown as string),
  };
}

function platformsOf(pkgs: ReadonlyArray<{ platform: string }>): WorldPlatforms {
  let pc = false;
  let android = false;
  for (const p of pkgs) {
    if (p.platform === "standalonewindows") pc = true;
    else if (p.platform === "android") android = true;
  }
  return { pc, android };
}

function validDate(v?: string): string | undefined {
  if (!v || v === "none") return undefined;
  return toIso(v);
}

interface RawAvatar {
  id: string;
  name: string;
  authorId?: string;
  authorName?: string;
  description?: string;
  imageUrl?: string;
  thumbnailImageUrl?: string;
  releaseStatus?: string;
  tags?: string[];
  favorites?: number;
  created_at?: string | Date;
  updated_at?: string | Date;
}

export function toAvatar(raw: RawAvatar): Avatar {
  return {
    id: raw.id,
    name: raw.name,
    authorId: raw.authorId ?? "",
    authorName: raw.authorName ?? "",
    description: raw.description ?? "",
    imageUrl: raw.imageUrl ?? "",
    thumbnailImageUrl: raw.thumbnailImageUrl ?? "",
    releaseStatus: raw.releaseStatus ?? "private",
    tags: raw.tags ?? [],
    favorites: raw.favorites ?? 0,
    createdAt: toIso(raw.created_at),
    updatedAt: toIso(raw.updated_at),
  };
}
