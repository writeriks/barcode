import type { Product } from '../../types/product';
import {
  isChineseLanguage,
  isJapaneseLanguage,
} from './barcode';
import type { LookupSourceId, ProductSlice } from './types';

const OFF_FAMILY: LookupSourceId[] = [
  'open-food-facts',
  'open-beauty-facts',
  'open-products-facts',
  'open-pet-food-facts',
];

function identityOrder(language: string): LookupSourceId[] {
  if (isJapaneseLanguage(language)) {
    return ['yahoo-shopping', ...OFF_FAMILY, 'taobao'];
  }
  if (isChineseLanguage(language)) {
    return ['taobao', ...OFF_FAMILY, 'yahoo-shopping'];
  }
  return [...OFF_FAMILY, 'yahoo-shopping', 'taobao'];
}

function shoppingOrder(language: string): LookupSourceId[] {
  if (isChineseLanguage(language)) return ['taobao', 'yahoo-shopping'];
  return ['yahoo-shopping', 'taobao'];
}

function present<T>(value: T | undefined): value is T {
  if (value === undefined || value === null) return false;
  if (typeof value === 'string') return value.trim().length > 0;
  if (Array.isArray(value)) return value.length > 0;
  return true;
}

function pick<T>(
  order: LookupSourceId[],
  slices: ProductSlice[],
  read: (slice: ProductSlice) => T | undefined
): T | undefined {
  const byId = new Map(slices.map((slice) => [slice.sourceId, slice]));
  for (const id of order) {
    const slice = byId.get(id);
    if (!slice) continue;
    const value = read(slice);
    if (present(value)) return value;
  }
  for (const slice of slices) {
    if (order.includes(slice.sourceId)) continue;
    const value = read(slice);
    if (present(value)) return value;
  }
  return undefined;
}

export function hasDisplayableIdentity(product: Pick<Product, 'productName' | 'imageUrl'>): boolean {
  return present(product.productName) || present(product.imageUrl);
}

/** Folds every hit into one Product. Language only ranks sources for a
 *  given field — every hit still contributes whatever the others left empty. */
export function mergeSlices(barcode: string, language: string, slices: ProductSlice[]): Product {
  const identityRank = identityOrder(language);
  const shoppingRank = shoppingOrder(language);

  const productName = pick(identityRank, slices, (slice) => slice.identity?.name);
  const brands = pick(identityRank, slices, (slice) => slice.identity?.brand);
  const imageUrl = pick(identityRank, slices, (slice) => slice.identity?.imageUrl);

  const price = pick(shoppingRank, slices, (slice) => slice.shopping?.price);
  const currency = pick(shoppingRank, slices, (slice) => slice.shopping?.currency);
  const category = pick(shoppingRank, slices, (slice) => slice.shopping?.category);
  const url = pick(shoppingRank, slices, (slice) => slice.shopping?.url);
  const attribution = pick(shoppingRank, slices, (slice) => slice.shopping?.attribution);

  const nutriments = pick(OFF_FAMILY, slices, (slice) => slice.nutrition?.nutriments);
  const nutriscoreGrade = pick(OFF_FAMILY, slices, (slice) => {
    const grade = slice.nutrition?.nutriscoreGrade?.toLowerCase();
    if (!grade || grade === 'unknown' || grade === 'not-applicable') return undefined;
    return slice.nutrition?.nutriscoreGrade;
  });
  const novaGroup = pick(OFF_FAMILY, slices, (slice) => slice.nutrition?.novaGroup);

  const ingredientsText = pick(OFF_FAMILY, slices, (slice) => slice.ingredients?.text);
  const allergens = pick(OFF_FAMILY, slices, (slice) => slice.ingredients?.allergens);
  const allergensTags = pick(OFF_FAMILY, slices, (slice) => slice.ingredients?.allergensTags);

  const shopping =
    present(price) || present(category) || present(url)
      ? { price, currency, category, url, attribution }
      : undefined;

  return {
    code: barcode,
    productName,
    brands,
    imageUrl,
    ingredientsText,
    allergens,
    allergensTags,
    nutriments,
    nutriscoreGrade,
    novaGroup,
    shopping,
    sources: slices.map((slice) => slice.sourceId),
  };
}
