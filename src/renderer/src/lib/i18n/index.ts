export { I18nProvider, useI18n, useT } from "./I18nContext";
export {
  DEFAULT_LOCALE,
  NAMESPACES,
  availableLocales,
  getLocale,
  storedLocale,
  persistLocale,
  i18n,
} from "./registry";
export type { Locale, LocaleCode, LocaleMeta, Messages } from "./types";
