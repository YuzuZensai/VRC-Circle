export type ContentFilterKey =
  | "content_sex"
  | "content_adult"
  | "content_violence"
  | "content_gore"
  | "content_horror";

export interface AccountLink {
  linked: boolean;
  label?: string;
}

export interface AccountSettings {
  id: string;
  displayName: string;
  displayNameChangedAt?: string;
  previousDisplayName?: string;
  supporter: boolean;
  pronouns: string;
  email: string;
  emailVerified: boolean;
  pendingEmail?: string;
  twoFactorEnabled: boolean;
  twoFactorEnabledDate?: string;
  usesGeneratedPassword: boolean;
  ageVerificationStatus: "18+" | "hidden" | "verified";
  ageVerified: boolean;
  isAdult: boolean;
  contentFilters: ContentFilterKey[];
  contentFiltersLocked: boolean;
  sharedConnectionsHidden: boolean;
  discordFriendsHidden: boolean;
  discord: AccountLink;
  google: AccountLink;
  accountDeletionDate?: string | null;
}

export interface Pending2Fa {
  secret: string;
  qrCodeDataUrl: string;
}

export interface RecoveryCode {
  code: string;
  used: boolean;
}
