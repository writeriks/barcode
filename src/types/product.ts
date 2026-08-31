import type { OpenFoodFactsNutriments } from './openFoodFacts';

/** Stable ids for every lookup source we ship. A new API adds a member
 *  here, a provider file with `rank()`, and a line in the provider
 *  registry. Merge and the result UI never switch on these ids. */
export type LookupSourceId =
  | 'open-food-facts'
  | 'open-beauty-facts'
  | 'open-products-facts'
  | 'open-pet-food-facts'
  | 'yahoo-shopping'
  | 'taobao';

export interface ProductShopping {
  price?: number;
  currency?: string;
  category?: string;
  url?: string;
  attribution?: string;
}

/** Normalized product model used throughout the app. Every field except
 * `code` is optional — never assume a given source filled a given field. */
export interface Product {
  code: string;
  productName?: string;
  brands?: string;
  imageUrl?: string;
  /** Ingredients text resolved for the lookup language. */
  ingredientsText?: string;
  /** Localized, human-readable allergen names (from OFF's `allergens`
   * field, respecting the `lc` we requested). Prefer this for display;
   * falls back to deriving names from `allergensTags` when OFF doesn't
   * return a localized string for the requested language. */
  allergens?: string[];
  allergensTags?: string[];
  nutriments?: OpenFoodFactsNutriments;
  nutriscoreGrade?: string;
  novaGroup?: number;
  completeness?: number;
  statesTags?: string[];
  shopping?: ProductShopping;
  sources?: LookupSourceId[];
}

export type ProductSource = 'cache' | 'network';

/** Why a lookup was treated as incomplete, per the OFF completeness rules.
 *  Live lookup no longer emits this — kept so History entries saved under
 *  the old rule still type-check. */
export type IncompleteReason = 'low-completeness' | 'ingredients-to-be-completed';

/**
 * Discriminated union returned by lookupProduct(). `found` means at least
 * a name or image survived the merge. `incomplete` is only still listed
 * so History snapshots from older builds decode.
 */
export type LookupResult =
  | { status: 'found'; product: Product; source: ProductSource }
  | { status: 'incomplete'; product: Product; reason: IncompleteReason }
  | { status: 'not-found'; barcode: string }
  | { status: 'error'; barcode: string; message: string };
