export interface PhotoMetadata {
  author?: string;
  authorId?: string;
  worldId?: string;
  worldName?: string;
  takenAt?: string;
  width?: number;
  height?: number;
}

export interface Photo {
  id: string;
  fileName: string;
  bucket: string;
  src: string;
  thumb: string;
  sizeBytes: number;
  modifiedAt: string;
  metadata: PhotoMetadata;
}

export interface ThumbCacheStats {
  count: number;
  totalBytes: number;
  dir: string;
}

export interface GallerySnapshot {
  roots: string[];
  empty: boolean;
  photos: Photo[];
}
