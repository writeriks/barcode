import type { SliceComposer } from '../types';
import { pickField, present } from '../pick';

export const shoppingComposer: SliceComposer = {
  key: 'shopping',
  compose(product, slices) {
    const price = pickField(slices, (slice) => slice.shopping?.price);
    const currency = pickField(slices, (slice) => slice.shopping?.currency);
    const category = pickField(slices, (slice) => slice.shopping?.category);
    const url = pickField(slices, (slice) => slice.shopping?.url);
    const attribution = pickField(slices, (slice) => slice.shopping?.attribution);
    if (!present(price) && !present(category) && !present(url)) return product;
    return { ...product, shopping: { price, currency, category, url, attribution } };
  },
};
