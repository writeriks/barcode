import type { SliceComposer } from '../types';
import { identityComposer } from './identity';
import { ingredientsComposer } from './ingredients';
import { nutritionComposer } from './nutrition';
import { shoppingComposer } from './shopping';

/** Ordered fold of slice kinds onto Product. A new *kind* of lookup
 *  field appends a composer here; FoundProductScreen does not change
 *  unless you also add a matching result section. */
export const PRODUCT_SLICE_COMPOSERS: SliceComposer[] = [
  identityComposer,
  shoppingComposer,
  nutritionComposer,
  ingredientsComposer,
];
