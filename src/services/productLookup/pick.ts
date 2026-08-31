import type { ProductSlice, RankedSlice } from './types';

export function present<T>(value: T | undefined | null): value is T {
  if (value === undefined || value === null) return false;
  if (typeof value === 'string') return value.trim().length > 0;
  if (Array.isArray(value)) return value.length > 0;
  return true;
}

/** Callers pass slices already sorted by rank (then registry order). */
export function pickField<T>(
  slices: RankedSlice[],
  read: (slice: ProductSlice) => T | undefined
): T | undefined {
  for (const slice of slices) {
    const value = read(slice);
    if (present(value)) return value;
  }
  return undefined;
}

export function sortByRank(slices: RankedSlice[]): RankedSlice[] {
  return [...slices].sort((a, b) => b.rank - a.rank || (a.order ?? 0) - (b.order ?? 0));
}
