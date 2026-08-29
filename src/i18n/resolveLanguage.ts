import { SUPPORTED_LANGUAGES, type SupportedLanguage } from './languages';

const TRADITIONAL_CHINESE_REGIONS = new Set(['TW', 'HK', 'MO']);

function looksTraditionalChinese(
  code: string,
  languageTag: string,
  languageScriptCode: string | null,
  regionCode: string | null
): boolean {
  const script = (languageScriptCode ?? '').toLowerCase();
  if (script === 'hant') return true;
  if (script === 'hans') return false;
  if (/hant/i.test(code) || /hant/i.test(languageTag)) return true;
  if (/hans/i.test(code) || /hans/i.test(languageTag)) return false;
  const region = (regionCode ?? '').toUpperCase();
  if (TRADITIONAL_CHINESE_REGIONS.has(region)) return true;
  const tagRegion = languageTag
    .split('-')
    .find((part) => part.length === 2 && part === part.toUpperCase());
  return TRADITIONAL_CHINESE_REGIONS.has((tagRegion ?? '').toUpperCase());
}

/** Maps a device (or stored) language to one of the packs we ship, or
 *  null when we have no translation for it. Chinese is special: the OS
 *  reports `zh` for both scripts, so script / region / BCP-47 tag decide
 *  between simplified and traditional. */
export function resolveSupportedLanguage(
  languageCode?: string | null,
  options?: {
    languageTag?: string | null;
    languageScriptCode?: string | null;
    regionCode?: string | null;
  }
): SupportedLanguage | null {
  const code = (languageCode ?? '').trim();
  if (!code) return null;
  if ((SUPPORTED_LANGUAGES as readonly string[]).includes(code)) {
    return code as SupportedLanguage;
  }

  const lower = code.toLowerCase();
  const tag = options?.languageTag ?? '';
  const script = options?.languageScriptCode ?? null;
  const region = options?.regionCode ?? null;

  if (lower === 'zh-hans') return 'zh-Hans';
  if (lower === 'zh-hant') return 'zh-Hant';
  if (lower === 'ja' || lower.startsWith('ja-')) return 'ja';

  if (lower === 'zh' || lower.startsWith('zh')) {
    return looksTraditionalChinese(code, tag, script, region) ? 'zh-Hant' : 'zh-Hans';
  }

  const base = lower.split('-')[0];
  if ((SUPPORTED_LANGUAGES as readonly string[]).includes(base)) {
    return base as SupportedLanguage;
  }
  return null;
}
