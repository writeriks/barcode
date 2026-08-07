import * as Localization from 'expo-localization';

/** BCP-47 language code for the device's primary locale, e.g. "en", "fr". */
export function getDeviceLanguageCode(): string {
  return Localization.getLocales()[0]?.languageCode ?? 'en';
}

/** ISO 3166-1 alpha-2 region for the device's primary locale, e.g. "US",
 * "TR" — used to preselect a sensible default country calling code. */
export function getDeviceRegionCode(): string | null {
  return Localization.getLocales()[0]?.regionCode ?? null;
}

/**
 * OFF only gives us `ingredients_text` (product's own language) and
 * `ingredients_text_en`. Prefer the English field when the device is set to
 * English, otherwise fall back to the default text.
 */
export function resolveIngredientsText(
  ingredientsText: string | undefined,
  ingredientsTextEn: string | undefined,
  languageCode: string
): string | undefined {
  if (languageCode.toLowerCase() === 'en' && ingredientsTextEn) {
    return ingredientsTextEn;
  }
  return ingredientsText ?? ingredientsTextEn;
}
