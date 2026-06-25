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
