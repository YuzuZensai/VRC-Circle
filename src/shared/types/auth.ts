export type TwoFactorMethod = "totp" | "emailOtp";

export type AuthStatus =
  | { state: "unauthenticated" }
  | { state: "awaiting2fa"; methods: TwoFactorMethod[] }
  | { state: "authenticated"; user: CurrentUserSummary };

export interface Account {
  id: string;
  displayName: string;
  userIcon: string;
}

export interface CurrentUserSummary extends Account {
  currentAvatarThumbnailImageUrl: string;
}

export interface AccountsState {
  accounts: Account[];
  activeId: string | null;
}

export interface LoginCredentials {
  username: string;
  password: string;
}

export interface TwoFactorPayload {
  method: TwoFactorMethod;
  code: string;
}
