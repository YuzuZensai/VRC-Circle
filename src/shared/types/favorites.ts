export type FavoriteVisibility = "private" | "friends" | "public";

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
