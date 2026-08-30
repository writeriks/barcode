import { marketplaceEnabled } from './ranks';
import { selectProviders } from './select';
import type { LookupSourceId, ProductLookupProvider } from './types';

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(message);
}

assert(marketplaceEnabled('ja', 'ja') === true, 'Yahoo on for ja');
assert(marketplaceEnabled('ja', 'ja-JP') === true, 'Yahoo on for ja-JP');
assert(marketplaceEnabled('ja', 'en') === false, 'Yahoo off for en');
assert(marketplaceEnabled('ja', 'de') === false, 'Yahoo off for de');
assert(marketplaceEnabled('ja', 'zh-Hans') === false, 'Yahoo off for Chinese UI');
assert(marketplaceEnabled('zh', 'zh-Hans') === true, 'Taobao on for zh-Hans');
assert(marketplaceEnabled('zh', 'zh-Hant') === true, 'Taobao on for zh-Hant');
assert(marketplaceEnabled('zh', 'ja') === false, 'Taobao off for Japanese UI');
assert(marketplaceEnabled('zh', 'fr') === false, 'Taobao off for fr');

function stub(
  id: LookupSourceId,
  enabled?: (language: string) => boolean
): ProductLookupProvider {
  return {
    id,
    rank: () => 1,
    enabled,
    fetch: async () => ({ kind: 'miss' }),
  };
}

const registry: ProductLookupProvider[] = [
  stub('open-food-facts'),
  stub('yahoo-shopping', (language) => marketplaceEnabled('ja', language)),
  stub('taobao', (language) => marketplaceEnabled('zh', language)),
];

assert(
  selectProviders(registry, 'de').map((p) => p.id).join() === 'open-food-facts',
  'European UI only queries wiki DBs'
);
assert(
  selectProviders(registry, 'ja').map((p) => p.id).join() === 'open-food-facts,yahoo-shopping',
  'Japanese UI adds Yahoo only'
);
assert(
  selectProviders(registry, 'zh-Hans').map((p) => p.id).join() === 'open-food-facts,taobao',
  'Chinese UI adds Taobao only'
);

console.log('productLookup/select: ok');
