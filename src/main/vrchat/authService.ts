import type {
  AccountsState,
  AuthStatus,
  CurrentUserSummary,
  LoginCredentials,
  TwoFactorMethod,
  TwoFactorPayload,
} from "../../shared/types/auth";
import { clearLoginClient, createLoginClient, dropClient, getActiveClient } from "./client";
import {
  clearPending,
  listAccounts,
  promotePending,
  removeAccount,
  setActive,
} from "../accounts/store";
import { toCurrentUserSummary } from "./mappers";
import { userCache } from "./userService";
import { clearSessionCookies, syncSessionCookies } from "./cookies";
import { logger } from "../debug/logger";
import { seedActiveAccount } from "../store/social";
import { entityStore } from "../store/entityStore";
import { repos } from "../store/repository/manager";

interface VRChatLike {
  login: (opts: {
    username: string;
    password: string;
    twoFactorCode?: () => Promise<string> | string;
    throwOnError?: boolean;
  }) => Promise<unknown>;
  getCurrentUser: (opts?: { throwOnError?: boolean }) => Promise<{ data?: unknown }>;
  logout?: () => Promise<unknown>;
}

type RawUser = Parameters<typeof toCurrentUserSummary>[0];

function isRealUser(data: unknown): data is RawUser {
  return (
    !!data &&
    typeof data === "object" &&
    "id" in data &&
    "displayName" in data &&
    !("requiresTwoFactorAuth" in data)
  );
}

async function summaryFrom(vrc: VRChatLike): Promise<CurrentUserSummary> {
  const { data } = await vrc.getCurrentUser({ throwOnError: true });
  if (!isRealUser(data)) throw new Error("not authenticated");
  return toCurrentUserSummary(data);
}

let pendingTwoFactor: {
  resolveCode: (code: string) => void;
  methods: TwoFactorMethod[];
  loginDone: Promise<AuthStatus>;
} | null = null;

async function finalizeLogin(vrc: VRChatLike): Promise<AuthStatus> {
  const user = await summaryFrom(vrc);
  promotePending({
    id: user.id,
    displayName: user.displayName,
    userIcon: user.userIcon || user.currentAvatarThumbnailImageUrl,
  });
  clearLoginClient();
  userCache.clear();
  await syncSessionCookies(vrc);
  logger.info("auth", `signed in as ${user.displayName}`);
  void seedActiveAccount(true);
  return { state: "authenticated", user };
}

export async function checkStatus(): Promise<AuthStatus> {
  const vrc = getActiveClient() as unknown as VRChatLike | null;
  if (!vrc) return { state: "unauthenticated" };
  try {
    const user = await summaryFrom(vrc);
    await syncSessionCookies(vrc);
    void seedActiveAccount();
    return { state: "authenticated", user };
  } catch {
    return { state: "unauthenticated" };
  }
}

export async function login(creds: LoginCredentials): Promise<AuthStatus> {
  clearPending();
  const vrc = createLoginClient() as unknown as VRChatLike;

  let resolveCode!: (code: string) => void;
  let rejectCode!: (err: unknown) => void;
  const codePromise = new Promise<string>((res, rej) => {
    resolveCode = res;
    rejectCode = rej;
  });

  let signalAwaiting!: (methods: TwoFactorMethod[]) => void;
  const awaiting = new Promise<TwoFactorMethod[]>((res) => {
    signalAwaiting = res;
  });

  const loginDone: Promise<AuthStatus> = vrc
    .login({
      username: creds.username,
      password: creds.password,
      throwOnError: true,
      twoFactorCode: async () => {
        signalAwaiting(["totp", "emailOtp"]);
        return codePromise;
      },
    })
    .then(() => finalizeLogin(vrc))
    .catch((err) => {
      rejectCode(err);
      throw err;
    });

  const winner = await Promise.race([
    loginDone.then((status) => ({ kind: "done" as const, status })),
    awaiting.then((methods) => ({ kind: "await" as const, methods })),
  ]);

  if (winner.kind === "done") {
    pendingTwoFactor = null;
    return winner.status;
  }

  pendingTwoFactor = { resolveCode, methods: winner.methods, loginDone };
  return { state: "awaiting2fa", methods: winner.methods };
}

export async function verify2fa(payload: TwoFactorPayload): Promise<AuthStatus> {
  if (!pendingTwoFactor) return { state: "unauthenticated" };
  const { resolveCode, loginDone } = pendingTwoFactor;
  resolveCode(payload.code);
  try {
    const status = await loginDone;
    pendingTwoFactor = null;
    return status;
  } catch {
    pendingTwoFactor = null;
    return { state: "unauthenticated" };
  }
}

export function listAccountsState(): AccountsState {
  return listAccounts();
}

export async function switchAccount(id: string): Promise<AuthStatus> {
  setActive(id);
  userCache.clear();
  logger.info("auth", `switched account → ${id}`);
  return checkStatus();
}

export function removeAccountAction(id: string): AccountsState {
  dropClient(id);
  userCache.clear();
  repos.destroy(id);
  return removeAccount(id);
}

export async function logout(): Promise<void> {
  const id = listAccounts().activeId;
  const vrc = getActiveClient() as unknown as VRChatLike | null;
  try {
    await vrc?.logout?.();
  } catch {}
  pendingTwoFactor = null;
  entityStore.clear();
  await clearSessionCookies();
  if (id) removeAccountAction(id);
  const next = getActiveClient();
  if (next) {
    await syncSessionCookies(next);
    void seedActiveAccount(true);
  }
}
