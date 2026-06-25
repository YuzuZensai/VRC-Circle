import { homedir } from "node:os";
import { join } from "node:path";
import { existsSync, readFileSync } from "node:fs";
import { getConfig } from "../config/appConfig";

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

  const override = getConfig().gamePath;
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

export function vrchatPrefix(): string | null {
  for (const lib of steamLibraries()) {
    const prefix = join(lib, "compatdata", VRCHAT_APPID);
    if (existsSync(prefix)) return prefix;
  }
  return null;
}
