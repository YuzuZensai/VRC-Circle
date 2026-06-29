import type { WorldPlatforms } from "./world";

export interface AvatarPerformance {
  pc?: string;
  android?: string;
}

export interface Avatar {
  id: string;
  name: string;
  authorId: string;
  authorName: string;
  description: string;
  imageUrl: string;
  thumbnailImageUrl: string;
  releaseStatus: string;
  tags: string[];
  favorites: number;
  featured?: boolean;
  platforms?: WorldPlatforms;
  performance?: AvatarPerformance;
  createdAt?: string;
  updatedAt?: string;
}

export interface AvatarEdit {
  name?: string;
  description?: string;
  releaseStatus?: string;
}

export type FavoriteVisibility = "private" | "friends" | "public";

export interface FavoriteAvatarFolder {
  name: string;
  displayName: string;
  visibility: FavoriteVisibility;
  avatarIds: string[];
}

export interface FavoriteLimits {
  maxGroups: number;
  maxPerGroup: number;
}

export interface FavoriteGroupEdit {
  displayName?: string;
  visibility?: FavoriteVisibility;
}

export interface AvatarSnapshot {
  avatars: Avatar[];
  mineIds: string[];
  favorites: FavoriteAvatarFolder[];
  favoriteLimits: FavoriteLimits;
}
