import type { SliceComposer } from '../types';
import { pickField } from '../pick';

export const identityComposer: SliceComposer = {
  key: 'identity',
  compose(product, slices) {
    return {
      ...product,
      productName: pickField(slices, (slice) => slice.identity?.name),
      brands: pickField(slices, (slice) => slice.identity?.brand),
      imageUrl: pickField(slices, (slice) => slice.identity?.imageUrl),
    };
  },
};
