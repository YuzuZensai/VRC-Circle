import type {
  AccountsState,
  AuthStatus,
  LoginCredentials,
  TwoFactorMethod,
  TwoFactorPayload,
} from "./types/auth";
import type { SocialSnapshot, UserProfile, UserStatus } from "./types/user";
import type { FavoriteWorldFolder, World, WorldSnapshot } from "./types/world";
import type { Instance } from "./types/instance";
import type { UnityStatus } from "./types/unity";
import type { Avatar } from "./types/avatar";
import type { RepoStats, StoredEntity } from "./types/repository";
import type { AccountSettings, ContentFilterKey, Pending2Fa, RecoveryCode } from "./types/settings";
import type { Group, GroupSnapshot } from "./types/group";
import type { EnhancementId, EnhancementsSnapshot } from "./types/enhancements";
import type { GallerySnapshot, Photo, ThumbCacheStats } from "./types/gallery";
import type { AppConfig } from "./types/appConfig";
import type { GameStatus } from "./types/game";
import type { IpcResult } from "./types/result";
import type { CacheEntryInfo, CacheStats, DebugSnapshot, LogEntry, WsEvent } from "./types/debug";

export interface CacheUpdate {
  cache: CacheEntryInfo[];
  stats: CacheStats;
}

export interface IpcRequests {
  "auth:status": () => IpcResult<AuthStatus>;
  "auth:login": (creds: LoginCredentials) => IpcResult<AuthStatus>;
  "auth:verify2fa": (payload: TwoFactorPayload) => IpcResult<AuthStatus>;
  "auth:logout": () => IpcResult<void>;

  "accounts:list": () => IpcResult<AccountsState>;
  "accounts:switch": (id: string) => IpcResult<AuthStatus>;
  "accounts:remove": (id: string) => IpcResult<AccountsState>;

  "user:me": () => IpcResult<UserProfile>;
  "user:get": (userId: string) => IpcResult<UserProfile>;
  "user:getByName": (username: string) => IpcResult<UserProfile>;
  "user:search": (query: string) => IpcResult<UserProfile[]>;

  "friends:list": () => IpcResult<UserProfile[]>;
  "friends:add": (userId: string) => IpcResult<void>;
  "friends:unfriend": (userId: string) => IpcResult<void>;
  "friends:invite": (p: { userId: string; instanceLocation: string }) => IpcResult<void>;
  "friends:requestInvite": (userId: string) => IpcResult<void>;

  "world:byUser": (userId: string) => IpcResult<World[]>;
  "world:search": (query: string) => IpcResult<World[]>;
  "world:favorites": (userId: string) => IpcResult<FavoriteWorldFolder[]>;
  "world:get": (worldId: string) => IpcResult<World>;
  "world:snapshot": () => IpcResult<WorldSnapshot>;

  "instance:get": (location: { worldId: string; instanceId: string }) => IpcResult<Instance>;

  "avatar:get": (avatarId: string) => IpcResult<Avatar>;
  "avatar:favorites": () => IpcResult<Avatar[]>;

  "group:byUser": (userId: string) => IpcResult<Group[]>;
  "group:represented": (userId: string) => IpcResult<Group | null>;
  "group:get": (groupId: string) => IpcResult<Group>;
  "group:snapshot": () => IpcResult<GroupSnapshot>;

  "social:snapshot": () => IpcResult<SocialSnapshot>;

  "settings:get": () => IpcResult<AccountSettings>;
  "settings:displayName": (p: {
    displayName: string;
    currentPassword: string;
  }) => IpcResult<AccountSettings>;
  "settings:revertDisplayName": (p: { currentPassword: string }) => IpcResult<AccountSettings>;
  "settings:email": (p: { email: string; currentPassword: string }) => IpcResult<AccountSettings>;
  "settings:password": (p: {
    currentPassword: string;
    newPassword: string;
  }) => IpcResult<AccountSettings>;
  "settings:privacy": (p: {
    sharedConnectionsHidden?: boolean;
    discordFriendsHidden?: boolean;
  }) => IpcResult<AccountSettings>;
  "settings:status": (p: { status: UserStatus; statusDescription: string }) => IpcResult<void>;
  "settings:contentFilters": (filters: ContentFilterKey[]) => IpcResult<AccountSettings>;
  "settings:enable2fa": () => IpcResult<Pending2Fa>;
  "settings:verify2fa": (code: string) => IpcResult<{ verified: boolean }>;
  "settings:disable2fa": () => IpcResult<AccountSettings>;
  "settings:recoveryCodes": () => IpcResult<RecoveryCode[]>;
  "settings:reverify2fa": (p: {
    method: TwoFactorMethod;
    code: string;
  }) => IpcResult<{ verified: boolean }>;
  "settings:resetUserData": () => IpcResult<void>;
  "settings:deleteAccount": () => IpcResult<AccountSettings>;

  "config:get": () => IpcResult<AppConfig>;
  "config:setGamePath": (p: { gamePath: string | null }) => IpcResult<AppConfig>;
  "config:pickGamePath": () => IpcResult<AppConfig>;

  "unity:status": () => IpcResult<UnityStatus>;
  "unity:install": (url: string) => IpcResult<void>;

  "game:status": () => IpcResult<GameStatus>;
  "game:launch": () => IpcResult<GameStatus>;

  "gallery:snapshot": () => IpcResult<GallerySnapshot>;
  "gallery:reveal": (path: string) => IpcResult<void>;
  "gallery:openExternal": (path: string) => IpcResult<void>;
  "gallery:delete": (paths: string[]) => IpcResult<void>;
  "gallery:thumbStats": () => IpcResult<ThumbCacheStats>;
  "gallery:thumbClear": () => IpcResult<ThumbCacheStats>;

  "enhancements:snapshot": () => IpcResult<EnhancementsSnapshot>;
  "enhancements:setEnabled": (p: {
    id: EnhancementId;
    enabled: boolean;
  }) => IpcResult<EnhancementsSnapshot>;

  "debug:snapshot": () => IpcResult<DebugSnapshot>;
  "debug:cacheInvalidate": (key: string) => IpcResult<CacheUpdate>;
  "debug:cacheClear": () => IpcResult<CacheUpdate>;
  "debug:repoStats": () => IpcResult<RepoStats[]>;
  "debug:repoInspect": (name: string) => IpcResult<StoredEntity<{ id: string }>[]>;
  "debug:repoClear": (name: string) => IpcResult<RepoStats[]>;
  "debug:repoFlush": (name: string) => IpcResult<RepoStats[]>;
  "debug:openWindow": () => IpcResult<void>;
}

export interface IpcEvents {
  "auth:changed": AuthStatus;
  "accounts:changed": AccountsState;
  "social:seed": SocialSnapshot;
  "social:upsert": UserProfile;
  "world:seed": WorldSnapshot;
  "world:upsert": World;
  "group:seed": GroupSnapshot;
  "group:upsert": Group;
  "world:favoriteFolders": { userId: string; folders: FavoriteWorldFolder[]; done: boolean };
  "game:changed": GameStatus;
  "gallery:added": Photo;
  "debug:log": LogEntry;
  "debug:cache": CacheUpdate;
  "ws:event": WsEvent;
}

export type IpcRequestChannel = keyof IpcRequests;
export type IpcEventChannel = keyof IpcEvents;
