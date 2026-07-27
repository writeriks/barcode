/**
 * Raw shapes for the Open Food Facts v2 product API, restricted to the
 * fields we request. Every product field is optional except `code` — OFF
 * returns whatever it has, and completeness varies a lot between products.
 * https://world.openfoodfacts.org/api/v2/product/{barcode}.json
 */

/** Common nutriment keys OFF exposes per 100g. Not exhaustive — OFF adds
 * more depending on the product, so unknown keys are still readable as
 * numbers via the index signature. */
export interface OpenFoodFactsNutriments {
  ['energy-kcal_100g']?: number;
  ['fat_100g']?: number;
  ['saturated-fat_100g']?: number;
  ['carbohydrates_100g']?: number;
  ['sugars_100g']?: number;
  ['fiber_100g']?: number;
  ['proteins_100g']?: number;
  ['salt_100g']?: number;
  ['sodium_100g']?: number;
  [key: string]: number | undefined;
}

export interface OpenFoodFactsProduct {
  code: string;
  product_name?: string;
  brands?: string;
  image_url?: string;
  ingredients_text?: string;
  ingredients_text_en?: string;
  allergens_tags?: string[];
  nutriments?: OpenFoodFactsNutriments;
  nutriscore_grade?: string;
  nova_group?: number;
  completeness?: number;
  states_tags?: string[];
}

/** Top-level response envelope. `status === 0` means the barcode has no
 * matching product in OFF's database. */
export interface OpenFoodFactsResponse {
  code: string;
  status: number;
  status_verbose?: string;
  product?: OpenFoodFactsProduct;
}
