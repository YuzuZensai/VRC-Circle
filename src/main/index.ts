import { app, BrowserWindow } from "electron";
import { join } from "node:path";
import { registerIpcHandlers } from "./ipc/handlers";
import { reconcile as reconcileEnhancements } from "./enhancements/service";
import { registerGalleryScheme, registerGalleryProtocol } from "./gallery/protocol";
import { startSocialBridge } from "./store/social";
import { startWatcher as startGameWatcher } from "./game/launch";
import { startGalleryWatch, stopGalleryWatch } from "./gallery/watcher";
import { startDebugBridge } from "./debug/bridge";
import { logger } from "./debug/logger";
import { userCache } from "./vrchat/userService";
import { repos } from "./store/repository/manager";
import { activeId } from "./accounts/store";
import { closeClients } from "./vrchat/client";
import { createMainWindow, focusMainWindow } from "./windows";

if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on("second-instance", () => focusMainWindow());
  registerGalleryScheme();
  start();
}

function start(): void {
  let shuttingDown = false;

  const shutdown = (): void => {
    if (shuttingDown) return;
    shuttingDown = true;
    stopGalleryWatch();
    userCache.flushNow();
    repos.flushAll();
    closeClients();
  };

  const exitFromSignal = (): void => {
    shutdown();
    app.exit(0);
  };

  process.once("SIGINT", exitFromSignal);
  process.once("SIGTERM", exitFromSignal);

  app.whenReady().then(() => {
    userCache.persistTo(join(app.getPath("userData"), "cache.json"));
    repos.setActive(activeId());
    logger.info("app", `VRC Circle ${app.getVersion()} ready`);

    registerGalleryProtocol();
    registerIpcHandlers();
    reconcileEnhancements();
    startSocialBridge();
    startDebugBridge();
    startGameWatcher();
    startGalleryWatch();
    createMainWindow();

    app.on("activate", () => {
      if (BrowserWindow.getAllWindows().length === 0) createMainWindow();
    });
  });

  app.on("before-quit", () => {
    shutdown();
  });

  app.on("window-all-closed", () => {
    if (process.platform !== "darwin") app.quit();
  });
}
