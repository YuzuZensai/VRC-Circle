import { app, BrowserWindow } from "electron";
import { join } from "node:path";
import { registerIpcHandlers } from "./ipc/handlers";
import { reconcile as reconcileEnhancements, isEnabled } from "./enhancements/service";
import { registerGalleryScheme, registerGalleryProtocol } from "./gallery/protocol";
import { startSocialBridge } from "./store/social";
import { startWatcher as startGameWatcher, joinInstance } from "./game/launch";
import { parseLocation } from "../shared/types/user";
import { startRegionDetection } from "./game/region";
import { startGalleryWatch, stopGalleryWatch } from "./gallery/watcher";
import { startDebugBridge } from "./debug/bridge";
import { logger } from "./debug/logger";
import { userCache } from "./vrchat/userService";
import { repos } from "./store/repository/manager";
import { activeId } from "./accounts/store";
import { closeClients } from "./vrchat/client";
import { createMainWindow, focusMainWindow, broadcast } from "./windows";

function locationFromVrchatUrl(url: string): string | undefined {
  try {
    return new URL(url).searchParams.get("id") ?? undefined;
  } catch {
    return undefined;
  }
}

function handleVrchatUrl(url: string | undefined): boolean {
  if (!url || !url.startsWith("vrchat://")) return false;

  if (!isEnabled("vrchat-protocol-handler")) {
    logger.info("game", "ignoring vrchat:// url; handler disabled", { url });
    return false;
  }

  logger.info("game", "received vrchat:// url", { url });

  if (process.platform === "darwin") {
    const location = locationFromVrchatUrl(url);
    const parsed = parseLocation(location);
    if (!parsed) {
      logger.warn("game", "could not parse instance location from vrchat:// url", { url });
      return false;
    }
    broadcast("instance:open", {
      worldId: parsed.worldId,
      instanceId: parsed.instance,
      location: location!,
    });
    return true;
  }

  joinInstance(url).catch((err) => logger.warn("game", "join from protocol url failed", err));
  return true;
}

function vrchatUrlFromArgv(argv: string[]): string | undefined {
  return argv.find((a) => a.startsWith("vrchat://"));
}

if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  // already-running case (win32/linux): the new instance's argv carries the url
  app.on("second-instance", (_e, argv) => {
    const url = vrchatUrlFromArgv(argv);
    // a disabled protocol link must not steal focus; a plain re-launch still should
    if (url ? handleVrchatUrl(url) : true) focusMainWindow();
  });
  // macOS delivers protocol urls here, both cold and warm
  app.on("open-url", (_e, url) => {
    if (handleVrchatUrl(url)) focusMainWindow();
  });
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
    startRegionDetection();
    createMainWindow();

    handleVrchatUrl(vrchatUrlFromArgv(process.argv));

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
