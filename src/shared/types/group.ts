export interface Group {
  id: string;
  detailed?: boolean;
  name: string;
  shortCode?: string;
  description?: string;
  iconUrl?: string;
  bannerUrl?: string;
  ownerId?: string;
  memberCount?: number;
  privacy?: string;
  isRepresenting?: boolean;

  onlineMemberCount?: number;
  joinState?: string;
  isVerified?: boolean;
  rules?: string;
  languages?: string[];
  links?: string[];
  tags?: string[];
  createdAt?: string;
}

export interface GroupSnapshot {
  groups: Group[];
  byUser: Record<string, string[]>;
  representedByUser: Record<string, string>;
}
