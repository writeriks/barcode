export const SUPPORTED_LANGUAGES = [
  'en',
  'tr',
  'pl',
  'es',
  'fr',
  'it',
  'de',
  'ja',
  'zh-Hans',
  'zh-Hant',
] as const;

export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number];

export function isSupportedLanguage(code: string): code is SupportedLanguage {
  return (SUPPORTED_LANGUAGES as readonly string[]).includes(code);
}
