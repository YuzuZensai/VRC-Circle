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
  createdAt?: string;
  updatedAt?: string;
}
