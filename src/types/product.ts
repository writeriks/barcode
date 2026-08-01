import type { OpenFoodFactsNutriments } from './openFoodFacts';

/** Normalized product model used throughout the app. Every field except
 * `code` is optional — never assume OFF filled in a given field. */
export interface Product {
  code: string;
  productName?: string;
  brands?: string;
  imageUrl?: string;
  /** Ingredients text resolved for the device's locale (see
   * resolveIngredientsText), already picked between _en and the default. */
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
}

export type ProductSource = 'cache' | 'network';

/** Why a lookup was treated as incomplete, per the OFF completeness rules. */
export type IncompleteReason = 'low-completeness' | 'ingredients-to-be-completed';

/**
 * Discriminated union returned by lookupProduct(). `incomplete` and
 * `not-found` are both "misses" from the UI's point of view (render the
 * "we don't have this one yet" state), but incomplete still carries
 * whatever partial product data OFF returned so the UI can show a name/brand
 * if available.
 */
export type LookupResult =
  | { status: 'found'; product: Product; source: ProductSource }
  | { status: 'incomplete'; product: Product; reason: IncompleteReason }
  | { status: 'not-found'; barcode: string }
  | { status: 'error'; barcode: string; message: string };
