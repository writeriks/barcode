import type { ReactElement } from 'react';
import type { ProductResultSection } from './ProductResultContext';
import { PRODUCT_RESULT_SECTIONS } from './sections';

/** Bind an ordered section list into the result-screen body. Each
 *  section returns null when it has nothing to show, so a shopping-only
 *  hit never mounts Nutri-Score. A new *kind* of lookup data is a
 *  section file + one line in `sections.ts` — FoundProductScreen stays
 *  chrome (barcode, scan-again, ads). */
export function composeProductResult(sections: ProductResultSection[]) {
  return function ProductResultBody(): ReactElement {
    return (
      <>
        {sections.map((section) => {
          const Section = section.Component;
          return <Section key={section.id} />;
        })}
      </>
    );
  };
}

export const ProductResultBody = composeProductResult(PRODUCT_RESULT_SECTIONS);
