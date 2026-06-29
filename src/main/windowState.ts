import { app, screen, type BrowserWindow, type Rectangle } from "electron";
import { join } from "node:path";
import { jsonFile } from "./lib/jsonFile";

type Bounds = Rectangle & { maximized: boolean };

const path = () => join(app.getPath("userData"), "window-state.json");

const stateFile = jsonFile<Partial<Bounds> | null>(path, () => null);
const read = stateFile.read;

function onScreen(b: Rectangle): boolean {
  return screen.getAllDisplays().some((d) => {
    const w = d.workArea;
    return (
      b.x < w.x + w.width && b.x + b.width > w.x && b.y < w.y + w.height && b.y + b.height > w.y
    );
  });
}

export function restoreBounds(): { bounds?: Rectangle; maximized: boolean } {
  const saved = read();
  if (
    saved &&
    saved.width &&
    saved.height &&
    saved.x != null &&
    saved.y != null &&
    onScreen({ x: saved.x, y: saved.y, width: saved.width, height: saved.height })
  ) {
    return {
      bounds: { x: saved.x, y: saved.y, width: saved.width, height: saved.height },
      maximized: saved.maximized ?? false,
    };
  }
  return { maximized: saved?.maximized ?? false };
}

export function trackBounds(win: BrowserWindow): void {
  let normalBounds = win.getBounds();

  const save = (): void => {
    if (win.isDestroyed()) return;
    stateFile.write({ ...normalBounds, maximized: win.isMaximized() });
  };

  const remember = (): void => {
    if (!win.isMaximized() && !win.isMinimized() && !win.isFullScreen()) {
      normalBounds = win.getBounds();
    }
  };

  win.on("resize", remember);
  win.on("move", remember);
  win.on("close", save);
}
