import type { IncompleteReason, Product } from '../../types/product';

/** Result of a single fetch attempt against one provider. This is
 * intentionally provider-shaped, not UI-shaped — lookupProduct() layers
 * caching, retry, and timeout on top and translates this into LookupResult. */
export type ProviderResult =
  | { kind: 'found'; product: Product }
  | { kind: 'incomplete'; product: Product; reason: IncompleteReason }
  | { kind: 'not-found' }
  | { kind: 'error'; message: string };

/**
 * A source that can look up a product by barcode. Implement this to add a
 * second lookup source later (e.g. a different food database) without
 * touching lookupProduct() or any UI code.
 */
export interface ProductLookupProvider {
  readonly name: string;
  fetchProduct(barcode: string, signal: AbortSignal): Promise<ProviderResult>;
}
