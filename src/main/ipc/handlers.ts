import { BrowserWindow, dialog, ipcMain, shell } from "electron";
import type { IpcRequestChannel, IpcRequests } from "../../shared/ipc";
import { guard } from "../vrchat/errors";
import * as auth from "../vrchat/authService";
import * as users from "../vrchat/userService";
import * as friends from "../vrchat/friendsService";
import * as worlds from "../vrchat/worldService";
import * as avatars from "../vrchat/avatarService";
import * as groups from "../vrchat/groupService";
import * as settings from "../vrchat/settingsService";
import * as debug from "../debug/service";
import * as enhancements from "../enhancements/service";
import * as gallery from "../gallery/service";
import { thumbStats, clearThumbnails } from "../gallery/thumbnails";
import * as appConfig from "../config/appConfig";
import * as game from "../game/launch";
import { socialSnapshot } from "../store/social";
import { worldStore } from "../store/worldStore";
import { groupStore } from "../store/groupStore";
import { openDebugWindow } from "../windows";

const handlers = {
  "auth:status": () => guard(() => auth.checkStatus()),
  "auth:login": (creds) => guard(() => auth.login(creds)),
  "auth:verify2fa": (payload) => guard(() => auth.verify2fa(payload)),
  "auth:logout": () => guard(() => auth.logout()),

  "accounts:list": () => guard(async () => auth.listAccountsState()),
  "accounts:switch": (id) => guard(() => auth.switchAccount(id)),
  "accounts:remove": (id) => guard(async () => auth.removeAccountAction(id)),

  "user:me": () => guard(() => users.currentUser()),
  "user:get": (userId) => guard(() => users.getUser(userId)),
  "user:getByName": (username) => guard(() => users.getUserByName(username)),
  "user:search": (query) => guard(() => users.searchUsers(query)),

  "friends:list": () => guard(() => friends.listFriends()),

  "world:byUser": (userId) =>
    guard(async () => {
      const me = await users.currentUser();
      return worlds.getUserWorlds(userId, userId === me.id);
    }),
  "world:favorites": (userId) => guard(() => worlds.getFavoriteWorlds(userId)),
  "world:search": (query) => guard(() => worlds.searchWorlds(query)),
  "world:get": (worldId) => guard(() => worlds.getWorld(worldId)),
  "world:snapshot": () => guard(async () => worldStore.snapshot()),

  "avatar:get": (avatarId) => guard(() => avatars.getAvatar(avatarId)),
  "avatar:favorites": () => guard(() => avatars.getFavoritedAvatars()),

  "group:byUser": (userId) => guard(() => groups.getUserGroups(userId)),
  "group:represented": (userId) => guard(() => groups.getRepresentedGroup(userId)),
  "group:get": (groupId) => guard(() => groups.getGroup(groupId)),
  "group:snapshot": () => guard(async () => groupStore.snapshot()),

  "social:snapshot": () => guard(async () => socialSnapshot()),

  "settings:get": () => guard(() => settings.getSettings()),
  "settings:displayName": (p) =>
    guard(() => settings.setDisplayName(p.displayName, p.currentPassword)),
  "settings:revertDisplayName": (p) => guard(() => settings.revertDisplayName(p.currentPassword)),
  "settings:email": (p) => guard(() => settings.setEmail(p.email, p.currentPassword)),
  "settings:password": (p) => guard(() => settings.setPassword(p.currentPassword, p.newPassword)),
  "settings:privacy": (p) => guard(() => settings.setPrivacy(p)),
  "settings:status": (p) => guard(() => settings.setPresence(p.status, p.statusDescription)),
  "settings:contentFilters": (filters) => guard(() => settings.setContentFilters(filters)),
  "settings:enable2fa": () => guard(() => settings.beginTwoFactorSetup()),
  "settings:verify2fa": (code) => guard(() => settings.verifyTwoFactorSetup(code)),
  "settings:disable2fa": () => guard(() => settings.disableTwoFactor()),
  "settings:recoveryCodes": () => guard(() => settings.getRecoveryCodes()),
  "settings:reverify2fa": (p) => guard(() => settings.reverify2fa(p.method, p.code)),
  "settings:resetUserData": () => guard(() => settings.resetUserData()),
  "settings:deleteAccount": () => guard(() => settings.deleteAccount()),

  "config:get": () => guard(async () => appConfig.getConfig()),
  "config:setGamePath": (p) => guard(async () => appConfig.setGamePath(p.gamePath)),
  "config:pickGamePath": () =>
    guard(async () => {
      const win = BrowserWindow.getFocusedWindow() ?? BrowserWindow.getAllWindows()[0];
      const res = await dialog.showOpenDialog(win, {
        title: "Select your Steam or VRChat folder",
        properties: ["openDirectory"],
      });
      if (res.canceled || !res.filePaths[0]) return appConfig.getConfig();
      return appConfig.setGamePath(res.filePaths[0]);
    }),

  "game:status": () => guard(() => game.status()),
  "game:launch": () => guard(() => game.launch()),

  "gallery:snapshot": () => guard(async () => gallery.snapshot()),
  "gallery:reveal": (path) => guard(async () => void shell.showItemInFolder(path)),
  "gallery:openExternal": (path) =>
    guard(async () => {
      await shell.openPath(path);
    }),
  "gallery:delete": (paths) => guard(async () => gallery.remove(paths)),
  "gallery:thumbStats": () => guard(() => thumbStats()),
  "gallery:thumbClear": () => guard(() => clearThumbnails()),

  "enhancements:snapshot": () => guard(async () => enhancements.snapshot()),
  "enhancements:setEnabled": (p) => guard(async () => enhancements.setEnabled(p.id, p.enabled)),

  "debug:snapshot": () => guard(async () => debug.snapshot()),
  "debug:cacheInvalidate": (key) => guard(async () => debug.cacheInvalidate(key)),
  "debug:cacheClear": () => guard(async () => debug.cacheClear()),
  "debug:repoStats": () => guard(async () => debug.repoStats()),
  "debug:repoInspect": (name) => guard(async () => debug.repoInspect(name)),
  "debug:repoClear": (name) => guard(async () => debug.repoClear(name)),
  "debug:repoFlush": (name) => guard(async () => debug.repoFlush(name)),
  "debug:openWindow": () => guard(async () => openDebugWindow()),
} satisfies {
  [C in IpcRequestChannel]: (
    ...args: Parameters<IpcRequests[C]>
  ) => Promise<ReturnType<IpcRequests[C]>>;
};

export function registerIpcHandlers(): void {
  for (const channel of Object.keys(handlers) as IpcRequestChannel[]) {
    register(channel);
  }
}

function register<C extends IpcRequestChannel>(channel: C): void {
  const handler = handlers[channel] as (
    ...args: Parameters<IpcRequests[C]>
  ) => Promise<ReturnType<IpcRequests[C]>>;
  ipcMain.handle(channel, (_event, ...args) => handler(...(args as Parameters<IpcRequests[C]>)));
}
