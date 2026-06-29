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

export interface FavoriteAvatarFolder {
  name: string;
  displayName: string;
  avatarIds: string[];
}

export interface AvatarSnapshot {
  avatars: Avatar[];
  mineIds: string[];
  favorites: FavoriteAvatarFolder[];
}
