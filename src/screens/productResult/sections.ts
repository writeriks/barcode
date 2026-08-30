import type { ProductResultSection } from './ProductResultContext';
import { allergensSection } from './AllergensSection';
import { identitySection } from './IdentitySection';
import { ingredientsSection } from './IngredientsSection';
import { nutritionSection } from './NutritionSection';
import { scoresSection } from './ScoresSection';
import { shoppingSection } from './ShoppingSection';

/** Ordered blocks of the product result screen. Each returns null when
 *  it has nothing to show. `composeProductResult` turns this list into
 *  the screen body. A new kind of lookup data adds a file here and a
 *  line in this array — FoundProductScreen does not change. */
export const PRODUCT_RESULT_SECTIONS: ProductResultSection[] = [
  identitySection,
  shoppingSection,
  scoresSection,
  ingredientsSection,
  allergensSection,
  nutritionSection,
];
