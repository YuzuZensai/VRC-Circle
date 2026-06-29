import type { IpcRequests } from "../../../shared/ipc";
import type { ApiError } from "../../../shared/types/result";
import type { ContentFilterKey } from "../../../shared/types/settings";
import type { UserStatus } from "../../../shared/types/user";
import type { EnhancementId } from "../../../shared/types/enhancements";
import type { CreateInstanceInput } from "../../../shared/types/instance";
import type { PreferredRegion } from "../../../shared/types/appConfig";
import type { AvatarEdit, FavoriteGroupEdit, MoveResult } from "../../../shared/types/avatar";

export class ApiException extends Error {
  constructor(public readonly error: ApiError) {
    super(error.message);
    this.name = "ApiException";
  }
}

export function errorMessage(err: unknown, fallback: string): string {
  return err instanceof ApiException ? err.error.message : fallback;
}

type DataOf<R> = R extends { ok: true; data: infer D } ? D : never;

async function call<C extends keyof IpcRequests>(
  channel: C,
  ...args: Parameters<IpcRequests[C]>
): Promise<DataOf<Awaited<ReturnType<IpcRequests[C]>>>> {
  const result = await window.api.invoke(channel, ...(args as never));
  if (!result.ok) throw new ApiException(result.error);
  return result.data as never;
}

export const api = {
  auth: {
    status: () => call("auth:status"),
    login: (username: string, password: string) => call("auth:login", { username, password }),
    verify2fa: (method: "totp" | "emailOtp", code: string) =>
      call("auth:verify2fa", { method, code }),
    logout: () => call("auth:logout"),
  },
  accounts: {
    list: () => call("accounts:list"),
    switch: (id: string) => call("accounts:switch", id),
    remove: (id: string) => call("accounts:remove", id),
  },
  user: {
    me: () => call("user:me"),
    get: (id: string) => call("user:get", id),
    getByName: (name: string) => call("user:getByName", name),
    search: (query: string) => call("user:search", query),
  },
  friends: {
    list: () => call("friends:list"),
    add: (userId: string) => call("friends:add", userId),
    unfriend: (userId: string) => call("friends:unfriend", userId),
    invite: (userId: string, instanceLocation: string) =>
      call("friends:invite", { userId, instanceLocation }),
    requestInvite: (userId: string) => call("friends:requestInvite", userId),
  },
  world: {
    byUser: (userId: string) => call("world:byUser", userId),
    search: (query: string) => call("world:search", query),
    discover: () => call("world:discover"),
    favorites: (userId: string) => call("world:favorites", userId),
    get: (worldId: string) => call("world:get", worldId),
    snapshot: () => call("world:snapshot"),
  },
  instance: {
    get: (worldId: string, instanceId: string) => call("instance:get", { worldId, instanceId }),
    create: (input: CreateInstanceInput) => call("instance:create", input),
    inviteSelf: (worldId: string, instanceId: string) =>
      call("instance:inviteSelf", { worldId, instanceId }),
  },
  avatar: {
    get: (avatarId: string) => call("avatar:get", avatarId),
    snapshot: () => call("avatar:snapshot"),
    loadMine: () => call("avatar:loadMine"),
    loadFavorites: () => call("avatar:loadFavorites"),
    select: (avatarId: string) => call("avatar:select", avatarId),
    update: (avatarId: string, edit: AvatarEdit) => call("avatar:update", { avatarId, edit }),
    delete: (avatarId: string) => call("avatar:delete", avatarId),
    favorite: (avatarId: string, folder?: string) => call("avatar:favorite", { avatarId, folder }),
    unfavorite: (avatarId: string) => call("avatar:unfavorite", avatarId),
    moveFavorite: (avatarId: string, folder: string): Promise<MoveResult> =>
      call("avatar:moveFavorite", { avatarId, folder }),
    unfavoriteMany: (avatarIds: string[]) => call("avatar:unfavoriteMany", avatarIds),
    moveFavoriteMany: (avatarIds: string[], folder: string): Promise<MoveResult> =>
      call("avatar:moveFavoriteMany", { avatarIds, folder }),
    clearFavoriteFolder: (folder: string) => call("avatar:clearFavoriteFolder", folder),
    updateFavoriteFolder: (folder: string, edit: FavoriteGroupEdit) =>
      call("avatar:updateFavoriteFolder", { folder, edit }),
  },
  group: {
    byUser: (userId: string) => call("group:byUser", userId),
    represented: (userId: string) => call("group:represented", userId),
    get: (groupId: string) => call("group:get", groupId),
    snapshot: () => call("group:snapshot"),
  },
  social: {
    snapshot: () => call("social:snapshot"),
  },
  settings: {
    get: () => call("settings:get"),
    displayName: (displayName: string, currentPassword: string) =>
      call("settings:displayName", { displayName, currentPassword }),
    revertDisplayName: (currentPassword: string) =>
      call("settings:revertDisplayName", { currentPassword }),
    email: (email: string, currentPassword: string) =>
      call("settings:email", { email, currentPassword }),
    password: (currentPassword: string, newPassword: string) =>
      call("settings:password", { currentPassword, newPassword }),
    privacy: (p: { sharedConnectionsHidden?: boolean; discordFriendsHidden?: boolean }) =>
      call("settings:privacy", p),
    setStatus: (status: UserStatus, statusDescription: string) =>
      call("settings:status", { status, statusDescription }),
    contentFilters: (filters: ContentFilterKey[]) => call("settings:contentFilters", filters),
    enable2fa: () => call("settings:enable2fa"),
    verify2fa: (code: string) => call("settings:verify2fa", code),
    disable2fa: () => call("settings:disable2fa"),
    recoveryCodes: () => call("settings:recoveryCodes"),
    reverify2fa: (method: "totp" | "emailOtp", code: string) =>
      call("settings:reverify2fa", { method, code }),
    resetUserData: () => call("settings:resetUserData"),
    deleteAccount: () => call("settings:deleteAccount"),
  },
  config: {
    get: () => call("config:get"),
    setGamePath: (gamePath: string | null) => call("config:setGamePath", { gamePath }),
    pickGamePath: () => call("config:pickGamePath"),
    setPreferredRegion: (region: PreferredRegion) => call("config:setPreferredRegion", { region }),
  },
  region: {
    detect: () => call("region:detect"),
    ping: () => call("region:ping"),
  },
  unity: {
    status: () => call("unity:status"),
    install: (url: string) => call("unity:install", url),
  },
  game: {
    status: () => call("game:status"),
    launch: () => call("game:launch"),
    join: (location: string) => call("game:join", { location }),
  },
  gallery: {
    snapshot: () => call("gallery:snapshot"),
    reveal: (path: string) => call("gallery:reveal", path),
    openExternal: (path: string) => call("gallery:openExternal", path),
    delete: (paths: string[]) => call("gallery:delete", paths),
    thumbStats: () => call("gallery:thumbStats"),
    thumbClear: () => call("gallery:thumbClear"),
  },
  enhancements: {
    snapshot: () => call("enhancements:snapshot"),
    setEnabled: (id: EnhancementId, enabled: boolean) =>
      call("enhancements:setEnabled", { id, enabled }),
  },
  debug: {
    snapshot: () => call("debug:snapshot"),
    cacheInvalidate: (key: string) => call("debug:cacheInvalidate", key),
    cacheClear: () => call("debug:cacheClear"),
    repoStats: () => call("debug:repoStats"),
    repoInspect: (name: string) => call("debug:repoInspect", name),
    repoClear: (name: string) => call("debug:repoClear", name),
    repoFlush: (name: string) => call("debug:repoFlush", name),
    openWindow: () => call("debug:openWindow"),
  },
};

export const events = window.api.events;
