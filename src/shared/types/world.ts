export type ReleaseStatus = "public" | "private" | "hidden" | "all";

export interface WorldPlatforms {
  pc: boolean;
  android: boolean;
}

export interface World {
  id: string;
  detailed: boolean;
  name: string;
  authorId: string;
  authorName: string;
  description: string;
  imageUrl: string;
  thumbnailImageUrl: string;
  releaseStatus: ReleaseStatus;
  capacity: number;
  favorites: number;
  visits: number;
  occupants: number;
  heat: number;
  tags: string[];
  createdAt?: string;
  updatedAt?: string;

  recommendedCapacity?: number;
  popularity?: number;
  version?: number;
  publishedAt?: string;
  labsPublishedAt?: string;
  previewYoutubeId?: string;
  platforms?: WorldPlatforms;
  publicOccupants?: number;
  privateOccupants?: number;
  deleted?: boolean;
}

export interface WorldSnapshot {
  worlds: World[];
  byAuthor: Record<string, string[]>;
}

export interface FavoriteWorldFolder {
  name: string;
  displayName: string;
  worldIds: string[];
}

export type FavoriteVisibility = "private" | "friends" | "public";

export interface FavoriteWorldGroup {
  name: string;
  displayName: string;
  visibility: FavoriteVisibility;
  worldIds: string[];
}

export interface FavoriteLimits {
  maxGroups: number;
  maxPerGroup: number;
}

export interface FavoriteGroupEdit {
  displayName?: string;
  visibility?: FavoriteVisibility;
}

export interface MoveResult {
  moved: number;
  skipped: string[];
}

export interface WorldFavoritesSnapshot {
  groups: FavoriteWorldGroup[];
  limits: FavoriteLimits;
}

export interface DiscoverCategory {
  id: string;
  name: string;
  worlds: World[];
}
