import type { SliceComposer } from '../types';
import { pickField } from '../pick';

function usableGrade(grade: string | undefined): string | undefined {
  if (!grade) return undefined;
  const lower = grade.toLowerCase();
  if (lower === 'unknown' || lower === 'not-applicable') return undefined;
  return grade;
}

export const nutritionComposer: SliceComposer = {
  key: 'nutrition',
  compose(product, slices) {
    return {
      ...product,
      nutriments: pickField(slices, (slice) => slice.nutrition?.nutriments),
      nutriscoreGrade: pickField(slices, (slice) => usableGrade(slice.nutrition?.nutriscoreGrade)),
      novaGroup: pickField(slices, (slice) => slice.nutrition?.novaGroup),
    };
  },
};
