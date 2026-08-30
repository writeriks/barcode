import type { OpenFoodFactsNutriments } from '../../types/openFoodFacts';
import type { LookupSourceId } from '../../types/product';

export type { LookupSourceId };

export interface IdentitySlice {
  name?: string;
  brand?: string;
  imageUrl?: string;
}

export interface ShoppingSlice {
  price?: number;
  currency?: string;
  category?: string;
  url?: string;
  attribution?: string;
}

export interface NutritionSlice {
  nutriments?: OpenFoodFactsNutriments;
  nutriscoreGrade?: string;
  novaGroup?: number;
}

export interface IngredientsSlice {
  text?: string;
  allergens?: string[];
  allergensTags?: string[];
}

/**
 * One provider's contribution. Empty optional groups are omitted.
 * `lookupProduct` merges slices; the result screen renders whichever
 * groups survived. A new API that only fills `identity` needs no UI
 * change. A new *kind* of data adds a group here plus a result section.
 */
export interface ProductSlice {
  sourceId: LookupSourceId;
  identity?: IdentitySlice;
  shopping?: ShoppingSlice;
  nutrition?: NutritionSlice;
  ingredients?: IngredientsSlice;
}

export type ProviderOutcome =
  | { kind: 'hit'; slice: ProductSlice }
  | { kind: 'miss' }
  | { kind: 'error'; message: string };

export interface LookupContext {
  barcode: string;
  /** App i18n language (`ja`, `zh-Hans`, `en`, …), used for OFF `lc`
   *  and for which source wins when two fill the same field. */
  language: string;
  signal: AbortSignal;
}

export interface ProductLookupProvider {
  readonly id: LookupSourceId;
  fetch(ctx: LookupContext): Promise<ProviderOutcome>;
}
