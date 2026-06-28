import type { TrustRank, UserStatus } from "../../../shared/types/user";

export const trustMeta: Record<TrustRank, { label: string; color: string }> = {
  visitor: { label: "Visitor", color: "var(--trust-visitor)" },
  new: { label: "New User", color: "var(--trust-new)" },
  user: { label: "User", color: "var(--trust-user)" },
  known: { label: "Known User", color: "var(--trust-known)" },
  trusted: { label: "Trusted User", color: "var(--trust-trusted)" },
  veteran: { label: "Veteran", color: "var(--trust-veteran)" },
  nuisance: { label: "Nuisance", color: "var(--trust-troll)" },
  troll: { label: "Troll", color: "var(--trust-troll)" },
};

export function isOnline(u: {
  state?: "online" | "active" | "offline";
  location?: string;
  isSelf?: boolean;
}): boolean {
  if (u.isSelf) return true;
  if (u.state === "online" || u.state === "active") return true;
  return !!u.location && u.location !== "offline";
}

export function locationLabel(loc?: string): string | undefined {
  if (!loc || loc === "offline" || loc === "") return undefined;
  if (loc === "private") return "In a private world";
  if (loc === "traveling") return "Traveling…";
  return "In a world";
}

export const statusMeta: Record<UserStatus, { label: string; color: string }> = {
  "join me": { label: "Join Me", color: "var(--status-join)" },
  active: { label: "Online", color: "var(--status-active)" },
  "ask me": { label: "Ask Me", color: "var(--status-ask)" },
  busy: { label: "Do Not Disturb", color: "var(--status-busy)" },
  offline: { label: "Offline", color: "var(--status-offline)" },
};

export function avatarOf(p: {
  userIcon: string;
  currentAvatarImageUrl: string;
  currentAvatarThumbnailImageUrl: string;
}): string {
  return p.userIcon || p.currentAvatarThumbnailImageUrl || p.currentAvatarImageUrl;
}

export function bannerOf(p: {
  profilePicOverride: string;
  currentAvatarImageUrl: string;
  currentAvatarThumbnailImageUrl: string;
}): string {
  return p.profilePicOverride || p.currentAvatarImageUrl || p.currentAvatarThumbnailImageUrl;
}

export const developerLabels: Record<string, string> = {
  internal: "VRChat Developer",
  moderator: "VRChat Moderator",
};

export const regionLabels: Record<string, string> = {
  us: "US West",
  use: "US East",
  eu: "Europe",
  jp: "Japan",
};

export const regionFlags: Record<string, string> = {
  us: "🇺🇸",
  use: "🇺🇸",
  eu: "🇪🇺",
  jp: "🇯🇵",
};

export function regionFlag(region?: string): string | undefined {
  return region ? regionFlags[region.toLowerCase()] : undefined;
}

const languageNames: Record<string, string> = {
  eng: "English",
  kor: "Korean",
  rus: "Russian",
  spa: "Spanish",
  por: "Portuguese",
  zho: "Chinese",
  deu: "German",
  jpn: "Japanese",
  fra: "French",
  swe: "Swedish",
  nld: "Dutch",
  pol: "Polish",
  dan: "Danish",
  nor: "Norwegian",
  ita: "Italian",
  tha: "Thai",
  fin: "Finnish",
  hun: "Hungarian",
  ces: "Czech",
  tur: "Turkish",
  ara: "Arabic",
  ron: "Romanian",
  vie: "Vietnamese",
  ase: "ASL",
  bfi: "BSL",
  dse: "NGT (Dutch SL)",
  fsl: "LSF (French SL)",
  jsl: "JSL (Japanese SL)",
  kvk: "KSL (Korean SL)",
  ukr: "Ukrainian",
  ell: "Greek",
  heb: "Hebrew",
  ind: "Indonesian",
  hin: "Hindi",
  msa: "Malay",
  lat: "Latin",
  tlh: "Klingon",
  tok: "Toki Pona",
  mri: "Māori",
  car: "Carib",
};

export function languageLabel(code: string): string {
  return languageNames[code] ?? code.toUpperCase();
}
