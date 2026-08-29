import * as Localization from 'expo-localization';

/** The device's primary locale — language, script, region, and the full
 *  BCP-47 tag. Used when picking an app language: Chinese needs the
 *  script (or region) because `languageCode` is just `"zh"` for both. */
export function getDeviceLocale(): {
  languageCode: string;
  languageTag: string;
  languageScriptCode: string | null;
  regionCode: string | null;
} {
  const locale = Localization.getLocales()[0];
  return {
    languageCode: locale?.languageCode ?? 'en',
    languageTag: locale?.languageTag ?? 'en',
    languageScriptCode: locale?.languageScriptCode ?? null,
    regionCode: locale?.regionCode ?? null,
  };
}

/** BCP-47 language code for the device's primary locale, e.g. "en", "fr". */
export function getDeviceLanguageCode(): string {
  return getDeviceLocale().languageCode;
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
