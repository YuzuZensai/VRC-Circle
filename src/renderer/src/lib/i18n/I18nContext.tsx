import { useCallback, useEffect, type ReactNode } from "react";
import { I18nextProvider, useTranslation } from "react-i18next";
import type { Locale, LocaleCode } from "./types";
import { availableLocales, getLocale, i18n } from "./registry";
import { useAppConfig } from "../AppConfigContext";

export function I18nProvider({ children }: { children: ReactNode }) {
  const { config } = useAppConfig();
  useEffect(() => {
    const locale = config?.preferences.locale;
    if (locale && i18n.language !== locale) void i18n.changeLanguage(locale);
  }, [config?.preferences.locale]);
  return <I18nextProvider i18n={i18n}>{children}</I18nextProvider>;
}

interface I18nValue {
  locale: LocaleCode;
  current: Locale;
  locales: Locale[];
  setLocale: (code: LocaleCode) => void;
  t: ReturnType<typeof useTranslation>["t"];
}

export function useI18n(): I18nValue {
  const { setPreferences } = useAppConfig();
  const { t, i18n: instance } = useTranslation();
  const locale = instance.language as LocaleCode;

  const setLocale = useCallback(
    (code: LocaleCode) => {
      void instance.changeLanguage(code);
      void setPreferences({ locale: code });
    },
    [instance, setPreferences],
  );

  return { locale, current: getLocale(locale), locales: availableLocales(), setLocale, t };
}

export function useT(): ReturnType<typeof useTranslation>["t"] {
  return useTranslation().t;
}
