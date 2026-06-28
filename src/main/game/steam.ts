import { homedir } from "node:os";
import { dirname, join } from "node:path";
import { existsSync, readFileSync } from "node:fs";
import { gamePathOverride } from "../config/appConfig";

export const VRCHAT_APPID = "438100";

function platformBases(): string[] {
  const home = homedir();
  switch (process.platform) {
    case "win32":
      return [
        join(process.env["ProgramFiles(x86)"] ?? "C:\\Program Files (x86)", "Steam"),
        join(process.env.ProgramFiles ?? "C:\\Program Files", "Steam"),
      ];
    case "darwin":
      return [join(home, "Library", "Application Support", "Steam")];
    default:
      return [
        join(home, ".steam", "steam"),
        join(home, ".steam", "root"),
        join(home, ".local", "share", "Steam"),
        join(home, ".var", "app", "com.valvesoftware.Steam", ".local", "share", "Steam"),
      ];
  }
}

export function steamLibraries(): string[] {
  const bases = platformBases();
  const libs = new Set<string>();

  const override = gamePathOverride();
  if (override) {
    if (existsSync(join(override, "steamapps"))) libs.add(join(override, "steamapps"));
    if (existsSync(join(override, "compatdata"))) libs.add(override);
    bases.unshift(override);
  }

  for (const base of bases) {
    const lib = join(base, "steamapps");
    if (existsSync(lib)) libs.add(lib);
    const vdf = join(lib, "libraryfolders.vdf");
    if (!existsSync(vdf)) continue;
    try {
      for (const m of readFileSync(vdf, "utf8").matchAll(/"path"\s*"([^"]+)"/g)) {
        const other = join(m[1].replace(/\\\\/g, "\\"), "steamapps");
        if (existsSync(other)) libs.add(other);
      }
    } catch {
      /* malformed vdf */
    }
  }
  return [...libs];
}

export function steamRoot(): string {
  const prefix = vrchatPrefix();
  if (prefix) return dirname(dirname(dirname(prefix)));
  return platformBases()[0];
}

export function vrchatPrefix(): string | null {
  for (const lib of steamLibraries()) {
    const prefix = join(lib, "compatdata", VRCHAT_APPID);
    if (existsSync(prefix)) return prefix;
  }
  return null;
}

export function vrchatLaunchExe(): string | null {
  for (const lib of steamLibraries()) {
    const exe = join(lib, "common", "VRChat", "launch.exe");
    if (existsSync(exe)) return exe;
  }
  return null;
}

export function vrchatProton(): string | null {
  const prefix = vrchatPrefix();
  if (!prefix) return null;
  try {
    const info = readFileSync(join(prefix, "config_info"), "utf8").split("\n");
    const toolDir = info[1]?.split("/files/")[0]?.trim();
    if (toolDir) {
      const proton = join(toolDir, "proton");
      if (existsSync(proton)) return proton;
    }
  } catch {}
  return null;
}

export function detectedGamePath(): string | null {
  for (const lib of steamLibraries()) {
    const manifest = join(lib, `appmanifest_${VRCHAT_APPID}.acf`);
    if (existsSync(manifest)) return dirname(lib);
  }
  return null;
}
