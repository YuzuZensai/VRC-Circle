import i18n, { type Resource, type ResourceLanguage } from "i18next";
import { initReactI18next } from "react-i18next";
import { DEFAULT_LOCALE, LOCALES } from "../../../../shared/locales";
import type { Locale, LocaleCode } from "./types";

export { DEFAULT_LOCALE } from "../../../../shared/locales";

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
  return { meta: LOCALES.find((locale) => locale.code === code)!, messages: resources[code] ?? {} };
}

const registry = new Map<LocaleCode, Locale>(
  LOCALES.map((locale) => [locale.code, buildLocale(locale.code)]),
);

export function availableLocales(): Locale[] {
  return [...registry.values()];
}

export function getLocale(code: LocaleCode): Locale {
  return registry.get(code) ?? registry.get(DEFAULT_LOCALE)!;
}

void i18n.use(initReactI18next).init({
  lng: DEFAULT_LOCALE,
  fallbackLng: DEFAULT_LOCALE,
  ns: NAMESPACES,
  defaultNS: "common",
  resources,
  interpolation: { escapeValue: false },
  returnNull: false,
});

export { i18n };
