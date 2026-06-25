export interface Group {
  id: string;
  name: string;
  shortCode?: string;
  description?: string;
  iconUrl?: string;
  bannerUrl?: string;
  ownerId?: string;
  memberCount?: number;
  privacy?: string;
  isRepresenting?: boolean;
}
