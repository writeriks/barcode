import { resolveSupportedLanguage } from './resolveLanguage';

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(message);
}

assert(resolveSupportedLanguage('en') === 'en', 'en stays en');
assert(resolveSupportedLanguage('ja') === 'ja', 'ja stays ja');
assert(resolveSupportedLanguage('ja-JP') === 'ja', 'ja-JP maps to ja');
assert(resolveSupportedLanguage('de-DE') === 'de', 'de-DE maps to de');
assert(resolveSupportedLanguage('zh-Hans') === 'zh-Hans', 'stored zh-Hans');
assert(resolveSupportedLanguage('zh-Hant') === 'zh-Hant', 'stored zh-Hant');
assert(resolveSupportedLanguage('zh-hans') === 'zh-Hans', 'lowercase zh-hans');
assert(
  resolveSupportedLanguage('zh', { languageScriptCode: 'Hans' }) === 'zh-Hans',
  'zh + Hans script'
);
assert(
  resolveSupportedLanguage('zh', { languageScriptCode: 'Hant' }) === 'zh-Hant',
  'zh + Hant script'
);
assert(
  resolveSupportedLanguage('zh', { languageTag: 'zh-Hans-CN', regionCode: 'CN' }) === 'zh-Hans',
  'zh-Hans-CN tag'
);
assert(
  resolveSupportedLanguage('zh', { languageTag: 'zh-Hant-TW', regionCode: 'TW' }) === 'zh-Hant',
  'zh-Hant-TW tag'
);
assert(
  resolveSupportedLanguage('zh', { regionCode: 'TW' }) === 'zh-Hant',
  'zh + Taiwan region without script'
);
assert(
  resolveSupportedLanguage('zh', { regionCode: 'HK' }) === 'zh-Hant',
  'zh + Hong Kong region'
);
assert(
  resolveSupportedLanguage('zh', { regionCode: 'MO' }) === 'zh-Hant',
  'zh + Macao region'
);
assert(
  resolveSupportedLanguage('zh', { languageScriptCode: 'Hans', regionCode: 'TW' }) === 'zh-Hans',
  'script wins over region'
);
assert(resolveSupportedLanguage('zh') === 'zh-Hans', 'bare zh defaults to simplified');
assert(resolveSupportedLanguage('ko') === null, 'unsupported language is null');
assert(resolveSupportedLanguage('') === null, 'empty is null');

console.log('resolveLanguage: ok');
