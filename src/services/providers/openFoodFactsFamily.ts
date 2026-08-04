import { USER_AGENT } from '../../config/appInfo';
import type { OpenFoodFactsProduct, OpenFoodFactsResponse } from '../../types/openFoodFacts';
import type { Product } from '../../types/product';
import { getDeviceLanguageCode, resolveIngredientsText } from '../../utils/locale';
import type { ProductLookupProvider, ProviderResult } from './types';

const REQUESTED_FIELDS = [
  'code',
  'product_name',
  'brands',
  'image_url',
  'ingredients_text',
  'ingredients_text_en',
  'allergens_tags',
  'allergens',
  'nutriments',
  'nutriscore_grade',
  'nova_group',
  'completeness',
  'states_tags',
].join(',');

const INCOMPLETE_INGREDIENTS_STATE_TAG = 'en:ingredients-to-be-completed';
const MIN_COMPLETENESS = 0.4;

/** OFF's `allergens` field is a comma-separated string of display names in
 * whatever language `lc` requested. Empty/missing when OFF has no
 * translation for that language — callers should fall back to
 * allergensTags in that case. */
function parseAllergens(allergens: string | undefined): string[] | undefined {
  if (!allergens) return undefined;
  const names = allergens
    .split(',')
    .map((name) => name.trim())
    .filter(Boolean);
  return names.length > 0 ? names : undefined;
}

function normalizeProduct(raw: OpenFoodFactsProduct): Product {
  const languageCode = getDeviceLanguageCode();
  return {
    code: raw.code,
    productName: raw.product_name,
    brands: raw.brands,
    imageUrl: raw.image_url,
    ingredientsText: resolveIngredientsText(raw.ingredients_text, raw.ingredients_text_en, languageCode),
    allergens: parseAllergens(raw.allergens),
    allergensTags: raw.allergens_tags,
    nutriments: raw.nutriments,
    nutriscoreGrade: raw.nutriscore_grade,
    novaGroup: raw.nova_group,
    completeness: raw.completeness,
    statesTags: raw.states_tags,
  };
}

/** Applies the project's "is this actually useful data" rule on top of
 * whatever the API returned: too little completeness or a tag telling us
 * the ingredients specifically haven't been filled in both count as a miss.
 * Beauty/products/pet-food entries rarely carry nutriscore/nova data, but
 * those fields are already optional on Product so that's harmless. */
function classify(raw: OpenFoodFactsProduct): ProviderResult {
  const product = normalizeProduct(raw);

  if (typeof raw.completeness === 'number' && raw.completeness < MIN_COMPLETENESS) {
    return { kind: 'incomplete', product, reason: 'low-completeness' };
  }
  if (raw.states_tags?.includes(INCOMPLETE_INGREDIENTS_STATE_TAG)) {
    return { kind: 'incomplete', product, reason: 'ingredients-to-be-completed' };
  }
  return { kind: 'found', product };
}

/**
 * Every Open Food Facts sibling project (Beauty, Products, Pet Food) runs
 * the exact same v2 REST API, just on a different domain — this factory
 * builds a provider for any of them.
 */
function createOffFamilyProvider(name: string, host: string): ProductLookupProvider {
  return {
    name,

    async fetchProduct(barcode: string, signal: AbortSignal): Promise<ProviderResult> {
      const languageCode = getDeviceLanguageCode();
      const url = `https://${host}/api/v2/product/${encodeURIComponent(barcode)}.json?fields=${REQUESTED_FIELDS}&lc=${encodeURIComponent(languageCode)}`;

      let response: Response;
      try {
        response = await fetch(url, {
          headers: { 'User-Agent': USER_AGENT },
          signal,
        });
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Network request failed';
        return { kind: 'error', message };
      }

      if (response.status === 404) {
        return { kind: 'not-found' };
      }

      if (!response.ok) {
        return { kind: 'error', message: `${name} responded with status ${response.status}` };
      }

      let data: OpenFoodFactsResponse;
      try {
        data = await response.json();
      } catch {
        return { kind: 'error', message: `Could not parse ${name} response` };
      }

      if (data.status === 0 || !data.product) {
        return { kind: 'not-found' };
      }

      return classify(data.product);
    },
  };
}

export const openFoodFactsProvider = createOffFamilyProvider('open-food-facts', 'world.openfoodfacts.org');
export const openBeautyFactsProvider = createOffFamilyProvider('open-beauty-facts', 'world.openbeautyfacts.org');
export const openProductsFactsProvider = createOffFamilyProvider('open-products-facts', 'world.openproductsfacts.org');
export const openPetFoodFactsProvider = createOffFamilyProvider('open-pet-food-facts', 'world.openpetfoodfacts.org');
