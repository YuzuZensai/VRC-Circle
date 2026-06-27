import { app, BrowserWindow, shell } from "electron";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import type { IpcEventChannel, IpcEvents } from "../shared/ipc";
import { TRAFFIC_LIGHT_INSET } from "../shared/window";
import { restoreBounds, trackBounds } from "./windowState";

const __dirname = dirname(fileURLToPath(import.meta.url));
const isDev = !app.isPackaged;

let mainWindow: BrowserWindow | null = null;
let debugWindow: BrowserWindow | null = null;

export function broadcast<C extends IpcEventChannel>(channel: C, payload: IpcEvents[C]): void {
  for (const w of BrowserWindow.getAllWindows()) {
    if (!w.isDestroyed()) w.webContents.send(channel, payload);
  }
}

function load(win: BrowserWindow, hash = ""): void {
  if (isDev && process.env["ELECTRON_RENDERER_URL"]) {
    void win.loadURL(process.env["ELECTRON_RENDERER_URL"] + (hash ? `#${hash}` : ""));
  } else {
    void win.loadFile(join(__dirname, "../renderer/index.html"), hash ? { hash } : undefined);
  }
}

export function createMainWindow(): BrowserWindow {
  const restored = restoreBounds();
  mainWindow = new BrowserWindow({
    width: 1180,
    height: 760,
    ...restored.bounds,
    minWidth: 940,
    minHeight: 600,
    show: false,
    backgroundColor: "#0d0b14",
    titleBarStyle: "hiddenInset",
    trafficLightPosition: { x: TRAFFIC_LIGHT_INSET, y: TRAFFIC_LIGHT_INSET },
    autoHideMenuBar: true,
    webPreferences: {
      preload: join(__dirname, "../preload/index.mjs"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  if (restored.maximized) mainWindow.maximize();
  trackBounds(mainWindow);

  mainWindow.once("ready-to-show", () => mainWindow?.show());
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    void shell.openExternal(url);
    return { action: "deny" };
  });
  mainWindow.on("closed", () => {
    mainWindow = null;
  });

  load(mainWindow);
  return mainWindow;
}

export function focusMainWindow(): void {
  if (!mainWindow || mainWindow.isDestroyed()) return;
  if (mainWindow.isMinimized()) mainWindow.restore();
  mainWindow.show();
  mainWindow.focus();
}

export function openDebugWindow(): void {
  if (debugWindow && !debugWindow.isDestroyed()) {
    debugWindow.focus();
    return;
  }
  debugWindow = new BrowserWindow({
    width: 900,
    height: 720,
    minWidth: 620,
    minHeight: 480,
    show: false,
    backgroundColor: "#0d0b14",
    autoHideMenuBar: true,
    title: "VRC Circle — Debug",
    webPreferences: {
      preload: join(__dirname, "../preload/index.mjs"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  debugWindow.once("ready-to-show", () => debugWindow?.show());
  debugWindow.webContents.setWindowOpenHandler(({ url }) => {
    void shell.openExternal(url);
    return { action: "deny" };
  });
  debugWindow.on("closed", () => {
    debugWindow = null;
  });

  load(debugWindow, "debug");
}
