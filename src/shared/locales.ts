export const DEFAULT_LOCALE = "en" as const;

export const LOCALES = [
  { code: "en", nativeName: "English", englishName: "English" },
  { code: "ja", nativeName: "日本語", englishName: "Japanese" },
  { code: "th", nativeName: "ไทย", englishName: "Thai" },
] as const;

export type AppLocale = (typeof LOCALES)[number]["code"];

export function isAppLocale(value: unknown): value is AppLocale {
  return typeof value === "string" && LOCALES.some((locale) => locale.code === value);
}
