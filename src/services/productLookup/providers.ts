import type { ProductLookupProvider } from './types';
import {
  openBeautyFactsProvider,
  openFoodFactsProvider,
  openPetFoodFactsProvider,
  openProductsFactsProvider,
} from './openFoodFactsFamily';
import { taobaoBarcodeProvider } from './taobaoBarcode';
import { yahooShoppingProvider } from './yahooShopping';

/** The live lookup set. `composeLookup` still filters by `enabled` —
 *  Yahoo only for Japanese UI, Taobao only for Chinese — so a European
 *  scan never waits on those APIs. Append a provider (with `rank`) to
 *  include it; a new *kind* of field also needs a slice composer +
 *  result section. */
export const PRODUCT_LOOKUP_PROVIDERS: ProductLookupProvider[] = [
  openFoodFactsProvider,
  openBeautyFactsProvider,
  openProductsFactsProvider,
  openPetFoodFactsProvider,
  yahooShoppingProvider,
  taobaoBarcodeProvider,
];
