import { USER_AGENT } from '../../config/appInfo';
import type { OpenFoodFactsProduct, OpenFoodFactsResponse } from '../../types/openFoodFacts';
import { resolveIngredientsText } from '../../utils/locale';
import { offLanguageCode } from './barcode';
import { wikiDbRank } from './ranks';
import type { IngredientsSlice, LookupContext, LookupSourceId, ProductLookupProvider, ProviderOutcome } from './types';

const REQUESTED_FIELDS = [
  'code',
  'product_name',
  'product_name_ja',
  'product_name_zh',
  'brands',
  'image_url',
  'ingredients_text',
  'ingredients_text_en',
  'ingredients_text_ja',
  'ingredients_text_zh',
  'allergens_tags',
  'allergens',
  'nutriments',
  'nutriscore_grade',
  'nova_group',
].join(',');

function parseAllergens(allergens: string | undefined): string[] | undefined {
  if (!allergens) return undefined;
  const names = allergens
    .split(',')
    .map((name) => name.trim())
    .filter(Boolean);
  return names.length > 0 ? names : undefined;
}

function localizedName(raw: OpenFoodFactsProduct, language: string): string | undefined {
  const lc = offLanguageCode(language);
  if (lc === 'ja' && raw.product_name_ja) return raw.product_name_ja;
  if (lc === 'zh' && raw.product_name_zh) return raw.product_name_zh;
  return raw.product_name;
}

function localizedIngredients(raw: OpenFoodFactsProduct, language: string): string | undefined {
  const lc = offLanguageCode(language);
  if (lc === 'ja' && raw.ingredients_text_ja) return raw.ingredients_text_ja;
  if (lc === 'zh' && raw.ingredients_text_zh) return raw.ingredients_text_zh;
  return resolveIngredientsText(raw.ingredients_text, raw.ingredients_text_en, lc);
}

function toIngredients(raw: OpenFoodFactsProduct, language: string): IngredientsSlice | undefined {
  const text = localizedIngredients(raw, language);
  const allergens = parseAllergens(raw.allergens);
  const allergensTags = raw.allergens_tags;
  if (!text && !allergens && !(allergensTags && allergensTags.length > 0)) return undefined;
  return { text, allergens, allergensTags };
}

function hasAnyContent(raw: OpenFoodFactsProduct, language: string): boolean {
  return Boolean(
    localizedName(raw, language) ||
      raw.brands ||
      raw.image_url ||
      toIngredients(raw, language) ||
      raw.nutriments ||
      raw.nutriscore_grade ||
      raw.nova_group
  );
}

/**
 * Every Open Food Facts sibling project runs the same v2 REST API on a
 * different host. Completeness is no longer a veto — a stub still hands
 * over whatever name or image it has, and merge lets a shopping hit fill
 * the rest.
 */
function createOffFamilyProvider(id: LookupSourceId, host: string): ProductLookupProvider {
  return {
    id,
    rank: wikiDbRank,

    async fetch(ctx: LookupContext): Promise<ProviderOutcome> {
      const lc = offLanguageCode(ctx.language);
      const url = `https://${host}/api/v2/product/${encodeURIComponent(ctx.barcode)}.json?fields=${REQUESTED_FIELDS}&lc=${encodeURIComponent(lc)}`;

      let response: Response;
      try {
        response = await fetch(url, {
          headers: { 'User-Agent': USER_AGENT },
          signal: ctx.signal,
        });
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Network request failed';
        return { kind: 'error', message };
      }

      if (response.status === 404) return { kind: 'miss' };
      if (!response.ok) {
        return { kind: 'error', message: `${id} responded with status ${response.status}` };
      }

      let data: OpenFoodFactsResponse;
      try {
        data = await response.json();
      } catch {
        return { kind: 'error', message: `Could not parse ${id} response` };
      }

      if (data.status === 0 || !data.product) return { kind: 'miss' };
      const raw = data.product;
      if (!hasAnyContent(raw, ctx.language)) return { kind: 'miss' };

      const ingredients = toIngredients(raw, ctx.language);
      const name = localizedName(raw, ctx.language);
      const nutriscore = raw.nutriscore_grade;
      const usableGrade =
        nutriscore && nutriscore !== 'unknown' && nutriscore !== 'not-applicable' ? nutriscore : undefined;

      return {
        kind: 'hit',
        slice: {
          sourceId: id,
          identity:
            name || raw.brands || raw.image_url
              ? { name, brand: raw.brands, imageUrl: raw.image_url }
              : undefined,
          nutrition:
            raw.nutriments || usableGrade || raw.nova_group
              ? { nutriments: raw.nutriments, nutriscoreGrade: usableGrade, novaGroup: raw.nova_group }
              : undefined,
          ingredients,
        },
      };
    },
  };
}

export const openFoodFactsProvider = createOffFamilyProvider('open-food-facts', 'world.openfoodfacts.org');
export const openBeautyFactsProvider = createOffFamilyProvider('open-beauty-facts', 'world.openbeautyfacts.org');
export const openProductsFactsProvider = createOffFamilyProvider(
  'open-products-facts',
  'world.openproductsfacts.org'
);
export const openPetFoodFactsProvider = createOffFamilyProvider(
  'open-pet-food-facts',
  'world.openpetfoodfacts.org'
);
