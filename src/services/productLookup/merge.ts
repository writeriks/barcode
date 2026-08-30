import type { Product } from '../../types/product';
import { PRODUCT_SLICE_COMPOSERS } from './composers';
import { present, sortByRank } from './pick';
import type { ProductLookupProvider, ProductSlice, RankedSlice, SliceComposer } from './types';

export { present } from './pick';

export function hasDisplayableIdentity(product: Pick<Product, 'productName' | 'imageUrl'>): boolean {
  return present(product.productName) || present(product.imageUrl);
}

/** Stamp each hit with the matching provider's language rank. Unknown
 *  source ids get rank 0 — they still fill fields nobody else filled. */
export function rankSlices(
  slices: ProductSlice[],
  language: string,
  providers: ProductLookupProvider[]
): RankedSlice[] {
  const meta = new Map(providers.map((provider, order) => [provider.id, { rank: provider.rank(language), order }]));
  return slices.map((slice, index) => {
    const known = meta.get(slice.sourceId);
    return {
      ...slice,
      rank: known?.rank ?? 0,
      order: known?.order ?? index,
    };
  });
}

export function mergeForLanguage(
  barcode: string,
  language: string,
  slices: ProductSlice[],
  providers: ProductLookupProvider[],
  composers?: SliceComposer[]
): Product {
  return mergeSlices(barcode, rankSlices(slices, language, providers), composers);
}

/** Folds ranked hits through the composer list. Language ranking lives
 *  on each provider (`rank`); this function never names a source. */
export function mergeSlices(
  barcode: string,
  slices: RankedSlice[],
  composers: SliceComposer[] = PRODUCT_SLICE_COMPOSERS
): Product {
  const withOrder = slices.map((slice, index) => ({
    ...slice,
    order: slice.order ?? index,
  }));
  const ranked = sortByRank(withOrder);
  const sources = [...withOrder]
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
    .map((slice) => slice.sourceId);

  let product: Product = { code: barcode, sources };
  for (const composer of composers) {
    product = composer.compose(product, ranked);
  }
  return product;
}
