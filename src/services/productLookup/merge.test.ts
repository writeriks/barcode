import { identityComposer } from './composers/identity';
import { hasDisplayableIdentity, mergeForLanguage, mergeSlices } from './merge';
import { marketplaceRank, wikiDbRank } from './ranks';
import type { LookupSourceId, ProductLookupProvider, ProductSlice, RankedSlice } from './types';

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(message);
}

function stub(id: LookupSourceId, rank: (language: string) => number): ProductLookupProvider {
  return { id, rank, fetch: async () => ({ kind: 'miss' }) };
}

/** Same ranks as the live registry, without importing fetchers (those
 *  pull React Native via expo-localization). */
const providers: ProductLookupProvider[] = [
  stub('open-food-facts', wikiDbRank),
  stub('open-beauty-facts', wikiDbRank),
  stub('open-products-facts', wikiDbRank),
  stub('open-pet-food-facts', wikiDbRank),
  stub('yahoo-shopping', (language) => marketplaceRank('ja', language)),
  stub('taobao', (language) => marketplaceRank('zh', language)),
];

function merge(language: string, slices: ProductSlice[], extra: ProductLookupProvider[] = []) {
  return mergeForLanguage('4900000000000', language, slices, [...providers, ...extra]);
}

const yahoo: ProductSlice = {
  sourceId: 'yahoo-shopping',
  identity: { name: 'カルピス', brand: 'アサヒ', imageUrl: 'https://example.com/y.jpg' },
  shopping: { price: 120, currency: 'JPY', category: '飲料', url: 'https://shopping.yahoo.co.jp/x', attribution: 'Yahoo! Shopping' },
};

const off: ProductSlice = {
  sourceId: 'open-food-facts',
  identity: { name: 'Calpis', brand: 'Asahi' },
  nutrition: { nutriscoreGrade: 'd', novaGroup: 4, nutriments: { 'energy-kcal_100g': 42 } },
  ingredients: { text: 'water, sugar' },
};

const mergedJa = merge('ja', [off, yahoo]);
assert(mergedJa.productName === 'カルピス', 'ja prefers Yahoo name');
assert(mergedJa.brands === 'アサヒ', 'ja prefers Yahoo brand');
assert(mergedJa.imageUrl === 'https://example.com/y.jpg', 'ja prefers Yahoo image');
assert(mergedJa.nutriscoreGrade === 'd', 'nutrition still comes from OFF');
assert(mergedJa.ingredientsText === 'water, sugar', 'ingredients still come from OFF');
assert(mergedJa.shopping?.price === 120, 'shopping price from Yahoo');
assert(hasDisplayableIdentity(mergedJa), 'merged ja product is displayable');

const mergedEn = merge('en', [off, yahoo]);
assert(mergedEn.productName === 'Calpis', 'en prefers OFF name when both exist');
assert(mergedEn.shopping?.price === 120, 'en still keeps Yahoo shopping fields');

const taobao: ProductSlice = {
  sourceId: 'taobao',
  identity: { name: '百事可乐', imageUrl: 'https://example.com/t.jpg' },
};
const mergedZh = merge('zh-Hans', [off, yahoo, taobao]);
assert(mergedZh.productName === '百事可乐', 'zh prefers Taobao name');

const stubOff: ProductSlice = {
  sourceId: 'open-food-facts',
  identity: { name: undefined },
  nutrition: { nutriscoreGrade: 'unknown' },
};
const shoppingOnly = merge('ja', [stubOff, yahoo]);
assert(shoppingOnly.productName === 'カルピス', 'Yahoo identity survives empty OFF stub');
assert(hasDisplayableIdentity(shoppingOnly), 'shopping-only is displayable');

const empty = merge('en', [{ sourceId: 'open-food-facts', nutrition: { nutriscoreGrade: 'unknown' } }]);
assert(!hasDisplayableIdentity(empty), 'nutrition-only stub is not displayable');

const upcitemdb: RankedSlice = {
  sourceId: 'upcitemdb' as LookupSourceId,
  rank: 200,
  identity: { name: 'Acme Soda' },
};
const offRanked: RankedSlice = {
  sourceId: 'open-food-facts',
  rank: 80,
  order: 1,
  identity: { name: 'Generic' },
  nutrition: { nutriscoreGrade: 'c' },
};
const unknownSource = mergeSlices('123', [offRanked, upcitemdb]);
assert(unknownSource.productName === 'Acme Soda', 'high-rank source merge has never heard of still wins identity');
assert(unknownSource.nutriscoreGrade === 'c', 'OFF still fills nutrition beside an unknown identity source');

const extraProvider: ProductLookupProvider = {
  id: 'upcitemdb' as LookupSourceId,
  rank: () => 200,
  fetch: async () => ({ kind: 'miss' }),
};
const pluggedIn = merge('en', [off, { sourceId: 'upcitemdb' as LookupSourceId, identity: { name: 'Acme Soda' } }], [
  extraProvider,
]);
assert(pluggedIn.productName === 'Acme Soda', 'appending a provider is enough for it to win via rank()');
assert(pluggedIn.nutriscoreGrade === 'd', 'existing composers still fold OFF nutrition');

const yahooRanked: RankedSlice = { ...yahoo, rank: 100 };
const identityOnly = mergeSlices('1', [yahooRanked], [identityComposer]);
assert(identityOnly.productName === 'カルピス', 'custom composer list still folds identity');
assert(identityOnly.shopping === undefined, 'omitting shopping composer drops shopping');

console.log('productLookup/merge: ok');
