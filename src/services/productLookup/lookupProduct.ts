import type { LookupResult } from '../../types/product';
import i18n from '../../i18n';
import { getCachedProduct, setCachedProduct } from '../cache';
import { hasDisplayableIdentity, mergeSlices } from './merge';
import { PRODUCT_LOOKUP_PROVIDERS } from './providers';
import type { ProductLookupProvider, ProductSlice, ProviderOutcome } from './types';

const TIMEOUT_MS = 5000;
const ATTEMPTS = 2;

function fetchWithTimeout(provider: ProductLookupProvider, barcode: string, language: string): Promise<ProviderOutcome> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  return provider.fetch({ barcode, language, signal: controller.signal }).finally(() => clearTimeout(timer));
}

async function fetchWithRetry(
  provider: ProductLookupProvider,
  barcode: string,
  language: string
): Promise<ProviderOutcome> {
  let last: ProviderOutcome = { kind: 'error', message: 'Lookup failed' };
  for (let attempt = 1; attempt <= ATTEMPTS; attempt++) {
    try {
      const result = await fetchWithTimeout(provider, barcode, language);
      if (result.kind !== 'error') return result;
      last = result;
    } catch (err) {
      last = { kind: 'error', message: err instanceof Error ? err.message : 'Lookup failed' };
    }
  }
  return last;
}

/**
 * Runs every registered provider in parallel, merges their slices, and
 * returns found as soon as any source gave a name or image. Camera,
 * photo upload, manual entry, and batch all call this.
 */
export async function lookupProduct(
  barcode: string,
  providers: ProductLookupProvider[] = PRODUCT_LOOKUP_PROVIDERS
): Promise<LookupResult> {
  const language = i18n.language;
  const cached = await getCachedProduct(barcode, language);
  if (cached) {
    return { status: 'found', product: cached, source: 'cache' };
  }

  const outcomes = await Promise.all(providers.map((provider) => fetchWithRetry(provider, barcode, language)));
  const slices: ProductSlice[] = [];
  const errors: string[] = [];
  for (const outcome of outcomes) {
    if (outcome.kind === 'hit') slices.push(outcome.slice);
    else if (outcome.kind === 'error') errors.push(outcome.message);
  }

  if (slices.length > 0) {
    const product = mergeSlices(barcode, language, slices);
    if (hasDisplayableIdentity(product)) {
      await setCachedProduct(product, language);
      return { status: 'found', product, source: 'network' };
    }
  }

  if (slices.length === 0 && errors.length === outcomes.length && errors[0]) {
    return { status: 'error', barcode, message: errors[0] };
  }

  return { status: 'not-found', barcode };
}
