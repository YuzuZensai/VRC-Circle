import { homedir } from "node:os";
import { join } from "node:path";
import { existsSync, readdirSync, readFileSync } from "node:fs";

function hubConfigDir(): string {
  const home = homedir();
  switch (process.platform) {
    case "win32":
      return join(process.env.APPDATA ?? join(home, "AppData", "Roaming"), "UnityHub");
    case "darwin":
      return join(home, "Library", "Application Support", "UnityHub");
    default:
      return join(home, ".config", "UnityHub");
  }
}

function hubBinaries(): string[] {
  const home = homedir();
  switch (process.platform) {
    case "win32":
      return [
        join(process.env.ProgramFiles ?? "C:\\Program Files", "Unity Hub", "Unity Hub.exe"),
        join(
          process.env["ProgramFiles(x86)"] ?? "C:\\Program Files (x86)",
          "Unity Hub",
          "Unity Hub.exe",
        ),
      ];
    case "darwin":
      return ["/Applications/Unity Hub.app"];
    default:
      return [
        "/usr/bin/unityhub",
        "/opt/unityhub/unityhub",
        join(home, ".local", "bin", "unityhub"),
      ];
  }
}

export function hubInstalled(): boolean {
  return hubBinaries().some(existsSync);
}

function defaultEditorRoot(): string {
  const home = homedir();
  switch (process.platform) {
    case "win32":
      return join(process.env.ProgramFiles ?? "C:\\Program Files", "Unity", "Hub", "Editor");
    case "darwin":
      return "/Applications/Unity/Hub/Editor";
    default:
      return join(home, "Unity", "Hub", "Editor");
  }
}

function customEditorRoot(): string | null {
  const file = join(hubConfigDir(), "secondaryInstallPath.json");
  try {
    const raw = JSON.parse(readFileSync(file, "utf8")) as unknown;
    const path = typeof raw === "string" ? raw : null;
    return path && path.trim() ? path.trim() : null;
  } catch {
    return null;
  }
}

export function editorRoot(): string | null {
  for (const root of [customEditorRoot(), defaultEditorRoot()]) {
    if (root && existsSync(root)) return root;
  }
  return null;
}

function editorBinaryName(): string {
  switch (process.platform) {
    case "win32":
      return join("Editor", "Unity.exe");
    case "darwin":
      return join("Unity.app");
    default:
      return join("Editor", "Unity");
  }
}

export function installedVersions(): string[] {
  const root = editorRoot();
  if (!root) return [];
  const binary = editorBinaryName();
  const out: string[] = [];
  try {
    for (const entry of readdirSync(root, { withFileTypes: true })) {
      if (!entry.isDirectory()) continue;
      if (existsSync(join(root, entry.name, binary))) out.push(entry.name);
    }
  } catch {
    return [];
  }
  return out.sort();
}
