import type { CurrentUser, VRChat } from "vrchat";
import type {
  AccountSettings,
  ContentFilterKey,
  Pending2Fa,
  RecoveryCode,
} from "../../shared/types/settings";
import type { TwoFactorMethod } from "../../shared/types/auth";
import type { UserStatus } from "../../shared/types/user";
import { requireActiveClient } from "./client";
import { userCache } from "./userService";
import { cacheKeys } from "../cache/policies";
import { entityStore } from "../store/entityStore";

const CONTENT_FILTER_KEYS: ContentFilterKey[] = [
  "content_sex",
  "content_adult",
  "content_violence",
  "content_gore",
  "content_horror",
];

function toIso(d?: Date | string | null): string | undefined {
  if (!d) return undefined;
  const date = typeof d === "string" ? new Date(d) : d;
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
}

function toSettings(u: CurrentUser): AccountSettings {
  const filters = (u.contentFilters ?? []).filter((t): t is ContentFilterKey =>
    (CONTENT_FILTER_KEYS as string[]).includes(t),
  );
  const lastPast = [...(u.pastDisplayNames ?? [])].sort(
    (a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime(),
  )[0];
  return {
    id: u.id,
    displayName: u.displayName,
    displayNameChangedAt: toIso(lastPast?.updated_at),
    previousDisplayName: lastPast?.displayName,
    supporter: (u.tags ?? []).includes("system_supporter"),
    pronouns: u.pronouns ?? "",
    email: u.obfuscatedEmail ?? "",
    emailVerified: u.emailVerified,
    pendingEmail: u.hasPendingEmail ? (u.obfuscatedPendingEmail ?? undefined) : undefined,
    twoFactorEnabled: u.twoFactorAuthEnabled,
    twoFactorEnabledDate: toIso(u.twoFactorAuthEnabledDate),
    usesGeneratedPassword: u.usesGeneratedPassword,
    ageVerificationStatus: u.ageVerificationStatus,
    ageVerified: u.ageVerified,
    isAdult: u.isAdult,
    contentFilters: filters,
    contentFiltersLocked: u.hideContentFilterSettings ?? false,
    sharedConnectionsHidden: Boolean(
      (u as { hasSharedConnectionsOptOut?: boolean }).hasSharedConnectionsOptOut,
    ),
    discordFriendsHidden: Boolean(
      (u as { hasDiscordFriendsOptOut?: boolean }).hasDiscordFriendsOptOut,
    ),
    discord: { linked: Boolean(u.discordId), label: u.discordDetails?.global_name },
    google: { linked: Boolean(u.googleId) },
    accountDeletionDate: toIso(u.accountDeletionDate) ?? null,
  };
}

function invalidateSelf(): void {
  userCache.invalidate(cacheKeys.currentUser());
}

function stepUpIfNeeded(data: unknown): void {
  if (!data || typeof data !== "object" || !("requiresTwoFactorAuth" in data)) return;
  const raw = (data as { requiresTwoFactorAuth?: string[] }).requiresTwoFactorAuth ?? [];
  const methods: TwoFactorMethod[] = [];
  if (raw.some((m) => m.toLowerCase() === "totp" || m.toLowerCase() === "otp"))
    methods.push("totp");
  if (raw.some((m) => m.toLowerCase() === "emailotp")) methods.push("emailOtp");
  throw {
    code: "requires_2fa",
    message: "Enter your two-factor code to continue.",
    methods: methods.length ? methods : (["totp"] as TwoFactorMethod[]),
  };
}

export async function reverify2fa(
  method: TwoFactorMethod,
  code: string,
): Promise<{ verified: boolean }> {
  const vrc = requireActiveClient();
  const { data } =
    method === "emailOtp"
      ? await vrc.verify2FaEmailCode({ body: { code }, throwOnError: true })
      : await vrc.verify2Fa({ body: { code }, throwOnError: true });
  return { verified: data.verified };
}

async function fetchCurrentUser(vrc: VRChat): Promise<CurrentUser> {
  const { data } = await vrc.getCurrentUser({ throwOnError: true });
  if ("requiresTwoFactorAuth" in data) throw { status: 401, message: "Session expired" };
  return data;
}

export async function getSettings(): Promise<AccountSettings> {
  return toSettings(await fetchCurrentUser(requireActiveClient()));
}

type UpdateBody = Parameters<VRChat["updateUser"]>[0]["body"];

async function patch(body: UpdateBody): Promise<AccountSettings> {
  const vrc = requireActiveClient();
  const me = await fetchCurrentUser(vrc);
  const { data } = await vrc.updateUser({ path: { userId: me.id }, body, throwOnError: true });
  invalidateSelf();
  return toSettings(data);
}

export function setDisplayName(
  displayName: string,
  currentPassword: string,
): Promise<AccountSettings> {
  return patch({ displayName, currentPassword });
}

export function revertDisplayName(currentPassword: string): Promise<AccountSettings> {
  return patch({ revertDisplayName: true, currentPassword });
}

export function setEmail(email: string, currentPassword: string): Promise<AccountSettings> {
  return patch({ email, currentPassword });
}

export function setPassword(
  currentPassword: string,
  newPassword: string,
): Promise<AccountSettings> {
  return patch({ currentPassword, password: newPassword });
}

export function setPrivacy(p: {
  sharedConnectionsHidden?: boolean;
  discordFriendsHidden?: boolean;
}): Promise<AccountSettings> {
  const body: Record<string, boolean> = {};
  if (p.sharedConnectionsHidden !== undefined)
    body.hasSharedConnectionsOptOut = p.sharedConnectionsHidden;
  if (p.discordFriendsHidden !== undefined) body.hasDiscordFriendsOptOut = p.discordFriendsHidden;
  return patch(body as UpdateBody);
}

export async function setPresence(status: UserStatus, statusDescription: string): Promise<void> {
  const vrc = requireActiveClient();
  const me = await fetchCurrentUser(vrc);
  await vrc.updateUser({
    path: { userId: me.id },
    body: { status: status as never, statusDescription },
    throwOnError: true,
  });
  invalidateSelf();
  entityStore.upsertFrom({ id: me.id, status, statusDescription }, "ws", Date.now());
}

export function setContentFilters(filters: ContentFilterKey[]): Promise<AccountSettings> {
  const ordered = CONTENT_FILTER_KEYS.filter((k) => filters.includes(k));
  return patch({ contentFilters: ordered });
}

export async function beginTwoFactorSetup(): Promise<Pending2Fa> {
  const vrc = requireActiveClient();
  const { data } = await vrc.enable2Fa({ throwOnError: true });
  return { secret: data.secret, qrCodeDataUrl: data.qrCodeDataUrl };
}

export async function verifyTwoFactorSetup(code: string): Promise<{ verified: boolean }> {
  const vrc = requireActiveClient();
  const { data } = await vrc.verifyPending2Fa({ body: { code }, throwOnError: true });
  if (data.verified) invalidateSelf();
  return { verified: data.verified };
}

export async function disableTwoFactor(): Promise<AccountSettings> {
  const vrc = requireActiveClient();
  const { data } = await vrc.disable2Fa({ throwOnError: true });
  stepUpIfNeeded(data);
  if (!data.removed) throw { status: 400, message: "VRChat did not remove two-factor auth." };
  invalidateSelf();
  const settings = toSettings(await fetchCurrentUser(vrc));
  return { ...settings, twoFactorEnabled: false, twoFactorEnabledDate: undefined };
}

export async function getRecoveryCodes(): Promise<RecoveryCode[]> {
  const vrc = requireActiveClient();
  const { data } = await vrc.getRecoveryCodes({ throwOnError: true });
  stepUpIfNeeded(data);
  return (data.otp ?? []).map((o) => ({ code: o.code, used: o.used }));
}

export async function resetUserData(): Promise<void> {
  const vrc = requireActiveClient();
  const me = await fetchCurrentUser(vrc);
  await vrc.deleteAllUserPersistenceData({ path: { userId: me.id }, throwOnError: true });
}

export async function deleteAccount(): Promise<AccountSettings> {
  const vrc = requireActiveClient();
  const me = await fetchCurrentUser(vrc);
  const { data } = await vrc.deleteUser({ path: { userId: me.id }, throwOnError: true });
  invalidateSelf();
  return toSettings(data);
}
