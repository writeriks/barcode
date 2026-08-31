import type { SliceComposer } from '../types';
import { pickField } from '../pick';

export const ingredientsComposer: SliceComposer = {
  key: 'ingredients',
  compose(product, slices) {
    return {
      ...product,
      ingredientsText: pickField(slices, (slice) => slice.ingredients?.text),
      allergens: pickField(slices, (slice) => slice.ingredients?.allergens),
      allergensTags: pickField(slices, (slice) => slice.ingredients?.allergensTags),
    };
  },
};
