// Regenerates src/utils/countryNames.ts from CLDR, via Node's own Intl.
//
// Run after adding or removing an entry in COUNTRY_CALLING_CODES:
//   node scripts/generateCountryNames.mjs
//
// Needs a Node built with full ICU, which every current release is. It
// writes names for exactly the countries the calling-code table lists, so
// the two can't drift apart.
import { readFileSync, writeFileSync } from 'node:fs';

const LANGUAGES = ['en', 'tr', 'pl', 'es', 'fr', 'it', 'de'];
const SOURCE = 'src/utils/countryCallingCodes.ts';
const TARGET = 'src/utils/countryNames.ts';

const isoCodes = [...readFileSync(SOURCE, 'utf8').matchAll(/iso2: '([A-Z]{2})'/g)].map((match) => match[1]);

const blocks = LANGUAGES.map((language) => {
  const displayNames = new Intl.DisplayNames([language], { type: 'region' });
  const entries = isoCodes
    .map((iso2) => `    ${iso2}: '${displayNames.of(iso2).replace(/'/g, "\\'")}',`)
    .join('\n');
  return `  ${language}: {\n${entries}\n  },`;
}).join('\n');

writeFileSync(
  TARGET,
  `// Generated file — do not edit by hand.
//
// Country names in every language the app ships in, taken from CLDR via
// Node's Intl.DisplayNames. Baked in rather than looked up at runtime:
// Hermes' Intl support varies by platform and version, and a picker that
// silently falls back to English on some devices is worse than one that
// never tries.
//
// Regenerate after changing COUNTRY_CALLING_CODES:
//   node scripts/generateCountryNames.mjs
import type { SupportedLanguage } from '../i18n';

const COUNTRY_NAMES: Record<SupportedLanguage, Record<string, string>> = {
${blocks}
};

/** The country's name in the given language, falling back to whatever the
 * calling-code table carries (English) for anything unlisted. */
export function localizedCountryName(iso2: string, language: string, fallback: string): string {
  const forLanguage = COUNTRY_NAMES[language as SupportedLanguage];
  return forLanguage?.[iso2] ?? fallback;
}
`
);

console.log(`Wrote ${isoCodes.length} countries × ${LANGUAGES.length} languages to ${TARGET}`);
