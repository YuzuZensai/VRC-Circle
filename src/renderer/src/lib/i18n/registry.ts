import i18n, { type Resource, type ResourceLanguage } from "i18next";
import { initReactI18next } from "react-i18next";
import type { Locale, LocaleCode, LocaleMeta } from "./types";

export const DEFAULT_LOCALE: LocaleCode = "en";

const STORAGE_KEY = "vrc-circle.locale";

const META: Record<LocaleCode, LocaleMeta> = {
  en: { code: "en", nativeName: "English", englishName: "English" },
  ja: { code: "ja", nativeName: "日本語", englishName: "Japanese" },
  th: { code: "th", nativeName: "ไทย", englishName: "Thai" },
};

const files = import.meta.glob<{ default: Record<string, unknown> }>("./locales/*/*.json", {
  eager: true,
});

const resources: Resource = {};
for (const [path, mod] of Object.entries(files)) {
  const m = /\.\/locales\/([^/]+)\/([^/]+)\.json$/.exec(path);
  if (!m) continue;
  const [, lang, ns] = m;
  (resources[lang] ??= {} as ResourceLanguage)[ns] = mod.default;
}

export const NAMESPACES = [
  ...new Set(Object.values(resources).flatMap((langNs) => Object.keys(langNs))),
];

function buildLocale(code: LocaleCode): Locale {
  return { meta: META[code], messages: resources[code] ?? {} };
}

const registry = new Map<LocaleCode, Locale>(
  (Object.keys(META) as LocaleCode[]).map((code) => [code, buildLocale(code)]),
);

export function availableLocales(): Locale[] {
  return [...registry.values()];
}

export function getLocale(code: LocaleCode): Locale {
  return registry.get(code) ?? registry.get(DEFAULT_LOCALE)!;
}

export function storedLocale(): LocaleCode {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    if (v && registry.has(v as LocaleCode)) return v as LocaleCode;
  } catch {}
  return DEFAULT_LOCALE;
}

export function persistLocale(code: LocaleCode): void {
  try {
    localStorage.setItem(STORAGE_KEY, code);
  } catch {}
}

void i18n.use(initReactI18next).init({
  lng: storedLocale(),
  fallbackLng: DEFAULT_LOCALE,
  ns: NAMESPACES,
  defaultNS: "common",
  resources,
  interpolation: { escapeValue: false },
  returnNull: false,
});

export { i18n };
