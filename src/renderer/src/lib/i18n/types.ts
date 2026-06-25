export type LocaleCode = "en" | "ja" | "th";

export interface LocaleMeta {
  code: LocaleCode;
  nativeName: string;
  englishName: string;
}

export type Messages = Record<string, unknown>;

export interface Locale {
  meta: LocaleMeta;
  messages: Messages;
}
