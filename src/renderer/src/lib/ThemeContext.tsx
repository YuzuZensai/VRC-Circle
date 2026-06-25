import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  applyAccent,
  applyTheme,
  builtInThemes,
  initialTheme,
  persistScheme,
  storedAccent,
  storedScheme,
  systemScheme,
  type SchemeMode,
  type Theme,
} from "./theme";

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
  const [themes, setThemes] = useState<Theme[]>(builtInThemes);
  const [theme, setActive] = useState<Theme>(() => {
    const t = initialTheme(builtInThemes);
    applyTheme(t);
    return t;
  });
  const [schemeMode, setMode] = useState<SchemeMode>(() => storedScheme());
  const [accent, setAccentState] = useState<string | null>(() => storedAccent());

  const setAccent = useCallback((hex: string | null) => {
    applyAccent(hex);
    setAccentState(hex);
  }, []);

  const setTheme = useCallback(
    (id: string) => {
      const next = themes.find((t) => t.id === id);
      if (!next) return;
      applyTheme(next);
      setActive(next);
    },
    [themes],
  );

  const setSchemeMode = useCallback(
    (mode: SchemeMode) => {
      persistScheme(mode);
      setMode(mode);
      const target = mode === "auto" ? systemScheme() : mode;
      const next = themes.find((t) => t.scheme === target);
      if (next) {
        applyTheme(next);
        setActive(next);
      }
    },
    [themes],
  );

  useEffect(() => {
    if (schemeMode !== "auto") return;
    const mq = window.matchMedia("(prefers-color-scheme: light)");
    const onChange = () => {
      const next = themes.find((t) => t.scheme === systemScheme());
      if (next) {
        applyTheme(next);
        setActive(next);
      }
    };
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, [schemeMode, themes]);

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
