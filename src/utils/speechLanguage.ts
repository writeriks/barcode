/** Maps the app's i18n language codes to BCP-47 tags for expo-speech's
 * `language` option — without this it falls back to the device's system
 * language, which may not match the language the extracted text is
 * actually in when the user has the app set to a different language. */
const SPEECH_LANGUAGE_TAGS: Record<string, string> = {
  en: 'en-US',
  tr: 'tr-TR',
  pl: 'pl-PL',
  es: 'es-ES',
  fr: 'fr-FR',
  it: 'it-IT',
  de: 'de-DE',
};

export function resolveSpeechLanguage(languageCode: string): string {
  return SPEECH_LANGUAGE_TAGS[languageCode] ?? 'en-US';
}
