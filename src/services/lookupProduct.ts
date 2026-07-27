import type { LookupResult } from '../types/product';
import { getCachedProduct, setCachedProduct } from './cache';
import { openFoodFactsProvider } from './providers/openFoodFactsProvider';
import type { ProductLookupProvider, ProviderResult } from './providers/types';

const TIMEOUT_MS = 5000;
const ATTEMPTS = 2; // one initial try + one retry

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

/**
 * Resolves a barcode to a product: local cache first, then the given
 * provider (defaults to Open Food Facts) with a 5s timeout and one retry on
 * failure. Swap `provider` to add a second lookup source without touching
 * any UI code.
 */
export async function lookupProduct(
  barcode: string,
  provider: ProductLookupProvider = openFoodFactsProvider
): Promise<LookupResult> {
  const cached = await getCachedProduct(barcode);
  if (cached) {
    return { status: 'found', product: cached, source: 'cache' };
  }

  const result = await fetchWithRetry(provider, barcode);

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
