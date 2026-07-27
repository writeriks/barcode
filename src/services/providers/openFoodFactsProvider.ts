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
  'nutriments',
  'nutriscore_grade',
  'nova_group',
  'completeness',
  'states_tags',
].join(',');

const INCOMPLETE_INGREDIENTS_STATE_TAG = 'en:ingredients-to-be-completed';
const MIN_COMPLETENESS = 0.4;

function normalizeProduct(raw: OpenFoodFactsProduct): Product {
  const languageCode = getDeviceLanguageCode();
  return {
    code: raw.code,
    productName: raw.product_name,
    brands: raw.brands,
    imageUrl: raw.image_url,
    ingredientsText: resolveIngredientsText(raw.ingredients_text, raw.ingredients_text_en, languageCode),
    allergensTags: raw.allergens_tags,
    nutriments: raw.nutriments,
    nutriscoreGrade: raw.nutriscore_grade,
    novaGroup: raw.nova_group,
    completeness: raw.completeness,
    statesTags: raw.states_tags,
  };
}

/** Applies the project's "is this actually useful data" rule on top of
 * whatever OFF returned: too little completeness or a tag telling us the
 * ingredients specifically haven't been filled in both count as a miss. */
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

export const openFoodFactsProvider: ProductLookupProvider = {
  name: 'open-food-facts',

  async fetchProduct(barcode: string, signal: AbortSignal): Promise<ProviderResult> {
    const url = `https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(barcode)}.json?fields=${REQUESTED_FIELDS}`;

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

    if (!response.ok) {
      return { kind: 'error', message: `Open Food Facts responded with status ${response.status}` };
    }

    let data: OpenFoodFactsResponse;
    try {
      data = await response.json();
    } catch {
      return { kind: 'error', message: 'Could not parse Open Food Facts response' };
    }

    if (data.status === 0 || !data.product) {
      return { kind: 'not-found' };
    }

    return classify(data.product);
  },
};
