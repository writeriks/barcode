/** Digits-only form, padded to EAN-13 when the scan was UPC-A (12). */
export function normalizeBarcode(code: string): string {
  const digits = code.replace(/\D/g, '');
  if (digits.length === 12) return `0${digits}`;
  return digits || code.trim();
}

export function offLanguageCode(language: string): string {
  const lower = language.toLowerCase();
  if (lower.startsWith('zh')) return 'zh';
  return lower.split('-')[0] || 'en';
}

export function isJapaneseLanguage(language: string): boolean {
  return language.toLowerCase().startsWith('ja');
}

export function isChineseLanguage(language: string): boolean {
  return language.toLowerCase().startsWith('zh');
}
