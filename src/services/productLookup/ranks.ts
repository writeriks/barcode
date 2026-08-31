import { isChineseLanguage, isJapaneseLanguage } from './barcode';

/** Open Food/Beauty/Products/Pet Food: preferred in most locales,
 *  yield identity to a local marketplace when the UI language is theirs. */
export function wikiDbRank(language: string): number {
  if (isJapaneseLanguage(language) || isChineseLanguage(language)) return 50;
  return 80;
}

/** Shopping marketplaces. `home` is the locale they should win. */
export function marketplaceRank(home: 'ja' | 'zh', language: string): number {
  if (home === 'ja' && isJapaneseLanguage(language)) return 100;
  if (home === 'zh' && isChineseLanguage(language)) return 100;
  return home === 'ja' ? 40 : 30;
}

/** Yahoo only runs for Japanese UI, Taobao only for Chinese. A German
 *  scan must not wait on a JP listing whose name the user cannot read. */
export function marketplaceEnabled(home: 'ja' | 'zh', language: string): boolean {
  if (home === 'ja') return isJapaneseLanguage(language);
  return isChineseLanguage(language);
}
