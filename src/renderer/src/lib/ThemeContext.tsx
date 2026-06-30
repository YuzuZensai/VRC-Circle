import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  applyAccent,
  applyTheme,
  builtInThemes,
  initialTheme,
  systemScheme,
  type SchemeMode,
  type Theme,
} from "./theme";
import { useAppConfig } from "./AppConfigContext";

interface ThemeContextValue {
  theme: Theme;
  themes: Theme[];
  schemeMode: SchemeMode;
  setSchemeMode: (mode: SchemeMode) => void;
  setTheme: (id: string) => void;
  registerTheme: (theme: Theme, activate?: boolean) => void;
  accent: string | null;
  setAccent: (hex: string | null) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const { config, setPreferences } = useAppConfig();
  const [themes, setThemes] = useState<Theme[]>(builtInThemes);
  const [theme, setActive] = useState<Theme>(() => {
    const t = initialTheme(builtInThemes, "auto");
    applyTheme(t);
    applyAccent(null);
    return t;
  });
  const [schemeMode, setMode] = useState<SchemeMode>("auto");
  const [accent, setAccentState] = useState<string | null>(null);
  const lastApplied = useRef<string>("");

  const setAccent = useCallback(
    (hex: string | null) => {
      applyAccent(hex);
      setAccentState(hex);
      void setPreferences({ accent: hex });
    },
    [setPreferences],
  );

  const setTheme = useCallback(
    (id: string) => {
      const next = themes.find((t) => t.id === id);
      if (!next) return;
      applyTheme(next);
      applyAccent(accent);
      setActive(next);
    },
    [themes, accent],
  );

  const setSchemeMode = useCallback(
    (mode: SchemeMode) => {
      setMode(mode);
      const target = mode === "auto" ? systemScheme() : mode;
      const next = themes.find((t) => t.scheme === target);
      if (next) {
        applyTheme(next);
        applyAccent(accent);
        setActive(next);
      }
      void setPreferences({ schemeMode: mode });
    },
    [themes, accent, setPreferences],
  );

  useEffect(() => {
    const prefs = config?.preferences;
    if (!prefs) return;
    const key = `${prefs.schemeMode}:${prefs.accent ?? ""}`;
    if (key === lastApplied.current) return;
    lastApplied.current = key;
    setMode(prefs.schemeMode);
    setAccentState(prefs.accent);
    const next = initialTheme(themes, prefs.schemeMode);
    applyTheme(next);
    applyAccent(prefs.accent);
    setActive(next);
  }, [config?.preferences, themes]);

  useEffect(() => {
    if (schemeMode !== "auto") return;
    const mq = window.matchMedia("(prefers-color-scheme: light)");
    const onChange = () => {
      const next = themes.find((t) => t.scheme === systemScheme());
      if (next) {
        applyTheme(next);
        applyAccent(accent);
        setActive(next);
      }
    };
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, [schemeMode, themes, accent]);

  const registerTheme = useCallback((custom: Theme, activate = false) => {
    setThemes((prev) => {
      const without = prev.filter((t) => t.id !== custom.id);
      return [...without, custom];
    });
    if (activate) {
      applyTheme(custom);
      setActive(custom);
    }
  }, []);

  const value = useMemo(
    () => ({
      theme,
      themes,
      schemeMode,
      setSchemeMode,
      setTheme,
      registerTheme,
      accent,
      setAccent,
    }),
    [theme, themes, schemeMode, setSchemeMode, setTheme, registerTheme, accent, setAccent],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within <ThemeProvider>");
  return ctx;
}
