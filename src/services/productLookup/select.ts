import type { ProductLookupProvider } from './types';

/** Providers that should run for this UI language. Marketplaces with
 *  `enabled` stay off outside their home locale so a European scan
 *  never waits on a Japanese or Chinese listing. */
export function selectProviders(
  providers: ProductLookupProvider[],
  language: string
): ProductLookupProvider[] {
  return providers.filter((provider) => provider.enabled?.(language) !== false);
}
