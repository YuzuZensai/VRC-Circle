export type FieldSource = "ws" | "rest:detail" | "rest:list" | "rest:search" | "seed";

export interface FieldMeta {
  at: number;
  src: FieldSource;
}

export interface EntityMeta {
  fields: Record<string, FieldMeta>;
  firstSeen: number;
  lastRead: number;
  lastFetch: number;
}

export interface StoredEntity<T> {
  data: T;
  meta: EntityMeta;
}

export interface RepoStats {
  name: string;
  count: number;
  totalSize: number;
  oldestRead: number | null;
  newestFetch: number | null;
  pendingWrites: number;
  backendFile: string | null;
}
