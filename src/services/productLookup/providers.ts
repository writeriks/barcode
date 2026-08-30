import type { ProductLookupProvider } from './types';
import {
  openBeautyFactsProvider,
  openFoodFactsProvider,
  openPetFoodFactsProvider,
  openProductsFactsProvider,
} from './openFoodFactsFamily';
import { taobaoBarcodeProvider } from './taobaoBarcode';
import { yahooShoppingProvider } from './yahooShopping';

/** The live lookup set. Append a provider (with `rank`) to include it
 *  in every camera, photo, manual, and batch scan. Merge never names
 *  sources — it folds whatever slices arrive, ranked by each provider.
 *  A new *kind* of field also needs a slice composer + result section. */
export const PRODUCT_LOOKUP_PROVIDERS: ProductLookupProvider[] = [
  openFoodFactsProvider,
  openBeautyFactsProvider,
  openProductsFactsProvider,
  openPetFoodFactsProvider,
  yahooShoppingProvider,
  taobaoBarcodeProvider,
];
