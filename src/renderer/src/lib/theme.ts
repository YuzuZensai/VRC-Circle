export type ThemeTokens = Record<string, string>;

export interface Theme {
  id: string;
  name: string;
  scheme: "dark" | "light";
  tokens: ThemeTokens;
}

const shared: ThemeTokens = {
  "--accent": "#06b6d4",
  "--on-accent": "#ffffff",
  "--accent-weak": "rgba(6, 182, 212, 0.14)",
  "--danger": "#ef4d6a",

  "--trust-visitor": "#9aa0aa",
  "--trust-new": "#3b82f6",
  "--trust-user": "#22c55e",
  "--trust-known": "#f97316",
  "--trust-trusted": "#8b5cf6",
  "--trust-veteran": "#eab308",
  "--trust-troll": "#9a4d4d",

  "--status-join": "#3b82f6",
  "--status-active": "#22c55e",
  "--status-ask": "#f59e0b",
  "--status-busy": "#ef4444",
  "--status-offline": "#8b8b94",

  "--overlay-strong": "rgb(0 0 0 / 0.62)",
  "--on-overlay": "#ffffff",
  "--shadow-strong": "0 24px 70px -20px rgb(0 0 0 / 0.7)",
  "--color-wheel":
    "conic-gradient(from 0deg, #f43f5e, #f59e0b, #10b981, #06b6d4, #3b82f6, #8b5cf6, #f43f5e)",

  "--radius-sm": "8px",
  "--radius": "12px",
  "--radius-lg": "18px",
  "--font-body": "'Inter', system-ui, -apple-system, sans-serif",
  "--font-mono": "'JetBrains Mono', ui-monospace, monospace",
};

export const darkTheme: Theme = {
  id: "dark",
  name: "Dark",
  scheme: "dark",
  tokens: {
    ...shared,
    "--bg": "#0e0e11",
    "--surface": "#16161a",
    "--surface-2": "#1d1d22",
    "--surface-hover": "#24242b",
    "--border": "#26262d",
    "--border-strong": "#33333c",
    "--text": "#f3f3f6",
    "--muted": "#a2a2ad",
    "--faint": "#6c6c78",
    "--shadow-1": "0 1px 2px rgba(0,0,0,0.4)",
    "--shadow-2": "0 16px 40px -24px rgba(0,0,0,0.8)",
    "--shadow-color": "rgb(0 0 0 / 0.4)",
    "--app-tint":
      "radial-gradient(1200px 600px at 100% -20%, rgba(6,182,212,0.08), transparent 60%)",
  },
};

export const lightTheme: Theme = {
  id: "light",
  name: "Light",
  scheme: "light",
  tokens: {
    ...shared,
    "--bg": "#f7f7f9",
    "--surface": "#ffffff",
    "--surface-2": "#f3f3f6",
    "--surface-hover": "#ececf1",
    "--border": "#e7e7ec",
    "--border-strong": "#dadae1",
    "--text": "#17171c",
    "--muted": "#62626c",
    "--faint": "#9a9aa4",
    "--shadow-1": "0 1px 2px rgba(20,20,30,0.06)",
    "--shadow-2": "0 16px 40px -24px rgba(20,20,40,0.25)",
    "--shadow-color": "rgb(20 20 40 / 0.18)",
    "--app-tint":
      "radial-gradient(1200px 600px at 100% -20%, rgba(6,182,212,0.10), transparent 60%)",
  },
};

export const builtInThemes: Theme[] = [darkTheme, lightTheme];

const STORAGE_KEY = "vrc-circle.theme";
const ACCENT_KEY = "vrc-circle.accent";
const SCHEME_KEY = "vrc-circle.scheme";

export type SchemeMode = "light" | "dark" | "auto";

export const ACCENT_PRESETS: { key: string; name: string; value: string }[] = [
  { key: "cyan", name: "Cyan", value: "#06b6d4" },
  { key: "iris", name: "Iris", value: "#7c6cff" },
  { key: "blue", name: "Blue", value: "#3b82f6" },
  { key: "emerald", name: "Emerald", value: "#10b981" },
  { key: "amber", name: "Amber", value: "#f59e0b" },
  { key: "rose", name: "Rose", value: "#f43f5e" },
  { key: "pink", name: "Pink", value: "#ec4899" },
  { key: "violet", name: "Violet", value: "#8b5cf6" },
];

export const DEFAULT_ACCENT = ACCENT_PRESETS[0].value;

export function applyTheme(theme: Theme): void {
  const root = document.documentElement;
  for (const [key, value] of Object.entries(theme.tokens)) {
    root.style.setProperty(key, value);
  }
  root.style.colorScheme = theme.scheme;
  root.dataset.theme = theme.id;
  try {
    localStorage.setItem(STORAGE_KEY, theme.id);
  } catch {}
  applyAccent(storedAccent());
}

export function applyAccent(hex: string | null): void {
  const root = document.documentElement;
  const accent = hex ?? DEFAULT_ACCENT;
  root.style.setProperty("--accent", accent);
  root.style.setProperty("--on-accent", readableOn(accent));
  root.style.setProperty("--accent-weak", withAlpha(accent, 0.14));
  try {
    if (hex) localStorage.setItem(ACCENT_KEY, hex);
    else localStorage.removeItem(ACCENT_KEY);
  } catch {}
}

export function storedAccent(): string | null {
  try {
    return localStorage.getItem(ACCENT_KEY);
  } catch {
    return null;
  }
}

function parseHex(hex: string): [number, number, number] | null {
  const m = /^#?([\da-f]{6})$/i.exec(hex.trim());
  if (!m) return null;
  const n = parseInt(m[1], 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function withAlpha(hex: string, alpha: number): string {
  const rgb = parseHex(hex);
  if (!rgb) return hex;
  return `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, ${alpha})`;
}

function readableOn(hex: string): string {
  const rgb = parseHex(hex);
  if (!rgb) return "#ffffff";
  const [r, g, b] = rgb.map((c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  return luminance > 0.45 ? "#15151b" : "#ffffff";
}

export function initialTheme(registry: Theme[]): Theme {
  const mode = storedScheme();
  if (mode !== "auto") {
    const pick = registry.find((t) => t.scheme === mode);
    if (pick) return pick;
  }

  let storedId: string | null = null;
  try {
    storedId = localStorage.getItem(STORAGE_KEY);
  } catch {}
  if (mode !== "auto") {
    const stored = registry.find((t) => t.id === storedId);
    if (stored) return stored;
  }
  return systemScheme() === "light" ? lightTheme : darkTheme;
}

export function systemScheme(): "light" | "dark" {
  const prefersLight =
    typeof window !== "undefined" && window.matchMedia("(prefers-color-scheme: light)").matches;
  return prefersLight ? "light" : "dark";
}

export function storedScheme(): SchemeMode {
  try {
    const v = localStorage.getItem(SCHEME_KEY);
    if (v === "light" || v === "dark" || v === "auto") return v;
  } catch {}
  return "auto";
}

export function persistScheme(mode: SchemeMode): void {
  try {
    localStorage.setItem(SCHEME_KEY, mode);
  } catch {}
}
