import type { LookupResult } from '../types/product';
import { getCachedProduct, setCachedProduct } from './cache';
import {
  openBeautyFactsProvider,
  openFoodFactsProvider,
  openPetFoodFactsProvider,
  openProductsFactsProvider,
} from './providers/openFoodFactsFamily';
import type { ProductLookupProvider, ProviderResult } from './providers/types';

const TIMEOUT_MS = 5000;
const ATTEMPTS = 2; // one initial try + one retry

// Queried in parallel (see lookupProduct) so a miss costs one round trip,
// not four stacked ones. Order only matters as a tie-breaker when more than
// one provider has the barcode — food's the app's primary use case, so it
// wins ties.
const DEFAULT_PROVIDERS: ProductLookupProvider[] = [
  openFoodFactsProvider,
  openBeautyFactsProvider,
  openProductsFactsProvider,
  openPetFoodFactsProvider,
];

function fetchWithTimeout(
  provider: ProductLookupProvider,
  barcode: string
): Promise<ProviderResult> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  return provider.fetchProduct(barcode, controller.signal).finally(() => clearTimeout(timer));
}

async function fetchWithRetry(
  provider: ProductLookupProvider,
  barcode: string
): Promise<ProviderResult> {
  let lastResult: ProviderResult = { kind: 'error', message: 'Lookup failed' };
  for (let attempt = 1; attempt <= ATTEMPTS; attempt++) {
    try {
      const result = await fetchWithTimeout(provider, barcode);
      if (result.kind !== 'error') return result;
      lastResult = result;
    } catch (err) {
      lastResult = { kind: 'error', message: err instanceof Error ? err.message : 'Lookup failed' };
    }
  }
  return lastResult;
}

/** Merges one result per provider (in priority order) into a single
 * verdict: any hit wins over any miss, a clean not-found beats a plain
 * error, and only all-providers-erroring counts as a real error. */
function mergeResults(results: ProviderResult[]): ProviderResult {
  const found = results.find((result) => result.kind === 'found' || result.kind === 'incomplete');
  if (found) return found;

  const notFound = results.find((result) => result.kind === 'not-found');
  if (notFound) return notFound;

  return results[0];
}

/**
 * Resolves a barcode to a product: local cache first, then every given
 * provider (defaults to the whole Open Food Facts family — food, beauty,
 * products, pet food) queried in parallel, each with a 5s timeout and one
 * retry on failure. Querying in parallel keeps a miss to one round trip
 * instead of stacking a timeout per provider.
 */
export async function lookupProduct(
  barcode: string,
  providers: ProductLookupProvider[] = DEFAULT_PROVIDERS
): Promise<LookupResult> {
  const cached = await getCachedProduct(barcode);
  if (cached) {
    return { status: 'found', product: cached, source: 'cache' };
  }

  const results = await Promise.all(providers.map((provider) => fetchWithRetry(provider, barcode)));
  const result = mergeResults(results);

  switch (result.kind) {
    case 'found':
      await setCachedProduct(result.product);
      return { status: 'found', product: result.product, source: 'network' };
    case 'incomplete':
      return { status: 'incomplete', product: result.product, reason: result.reason };
    case 'not-found':
      return { status: 'not-found', barcode };
    case 'error':
      return { status: 'error', barcode, message: result.message };
  }
}
