import type { ProductLookupProvider } from './types';
import {
  openBeautyFactsProvider,
  openFoodFactsProvider,
  openPetFoodFactsProvider,
  openProductsFactsProvider,
} from './openFoodFactsFamily';
import { taobaoBarcodeProvider } from './taobaoBarcode';
import { yahooShoppingProvider } from './yahooShopping';

/** The live lookup set. Append a provider to include it in every camera,
 *  photo, manual, and batch scan — merge and the result sections pick up
 *  whatever slices it fills. No other file has to change unless the API
 *  introduces a new *kind* of field. */
export const PRODUCT_LOOKUP_PROVIDERS: ProductLookupProvider[] = [
  openFoodFactsProvider,
  openBeautyFactsProvider,
  openProductsFactsProvider,
  openPetFoodFactsProvider,
  yahooShoppingProvider,
  taobaoBarcodeProvider,
];
