import type { OpenFoodFactsNutriments } from '../../types/openFoodFacts';
import type { LookupSourceId, Product } from '../../types/product';

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
 * change. A new *kind* of data adds a group here, a slice composer,
 * and a result section.
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
  /** Higher wins a contested field. Language-aware so a JP marketplace
   *  outranks a wiki DB for Japanese identity without merge naming it.
   *  Registry order breaks ties. */
  rank(language: string): number;
  /** When false, `composeLookup` does not call this provider. Omit to
   *  always fetch (wiki DBs). Marketplaces enable only their home UI. */
  enabled?(language: string): boolean;
  fetch(ctx: LookupContext): Promise<ProviderOutcome>;
}

/** A hit plus the provider's rank/order at lookup time. Merge never
 *  looks up source ids — it only sorts these. */
export type RankedSlice = ProductSlice & {
  rank: number;
  order?: number;
};

/** One *kind* of product data. Adding reviews / similar-items / etc. is
 *  a composer file + a result section; merge itself does not change. */
export interface SliceComposer {
  readonly key: string;
  compose(product: Product, slices: RankedSlice[]): Product;
}
