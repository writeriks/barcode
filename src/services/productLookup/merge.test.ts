import { hasDisplayableIdentity, mergeSlices } from './merge';
import type { ProductSlice } from './types';

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(message);
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

const mergedJa = mergeSlices('4900000000000', 'ja', [off, yahoo]);
assert(mergedJa.productName === 'カルピス', 'ja prefers Yahoo name');
assert(mergedJa.brands === 'アサヒ', 'ja prefers Yahoo brand');
assert(mergedJa.imageUrl === 'https://example.com/y.jpg', 'ja prefers Yahoo image');
assert(mergedJa.nutriscoreGrade === 'd', 'nutrition still comes from OFF');
assert(mergedJa.ingredientsText === 'water, sugar', 'ingredients still come from OFF');
assert(mergedJa.shopping?.price === 120, 'shopping price from Yahoo');
assert(hasDisplayableIdentity(mergedJa), 'merged ja product is displayable');

const mergedEn = mergeSlices('4900000000000', 'en', [off, yahoo]);
assert(mergedEn.productName === 'Calpis', 'en prefers OFF name when both exist');
assert(mergedEn.shopping?.price === 120, 'en still keeps Yahoo shopping fields');

const taobao: ProductSlice = {
  sourceId: 'taobao',
  identity: { name: '百事可乐', imageUrl: 'https://example.com/t.jpg' },
};
const mergedZh = mergeSlices('6900000000000', 'zh-Hans', [off, yahoo, taobao]);
assert(mergedZh.productName === '百事可乐', 'zh prefers Taobao name');

const stubOff: ProductSlice = {
  sourceId: 'open-food-facts',
  identity: { name: undefined },
  nutrition: { nutriscoreGrade: 'unknown' },
};
const shoppingOnly = mergeSlices('123', 'ja', [stubOff, yahoo]);
assert(shoppingOnly.productName === 'カルピス', 'Yahoo identity survives empty OFF stub');
assert(hasDisplayableIdentity(shoppingOnly), 'shopping-only is displayable');

const empty = mergeSlices('123', 'en', [
  { sourceId: 'open-food-facts', nutrition: { nutriscoreGrade: 'unknown' } },
]);
assert(!hasDisplayableIdentity(empty), 'nutrition-only stub is not displayable');

console.log('productLookup/merge: ok');
