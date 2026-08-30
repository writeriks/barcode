import { USER_AGENT } from '../../config/appInfo';
import { YAHOO_SHOPPING_APP_ID } from '../../config/lookupEnv';
import { normalizeBarcode } from './barcode';
import { marketplaceRank } from './ranks';
import type { LookupContext, ProductLookupProvider, ProviderOutcome } from './types';

const ENDPOINT = 'https://shopping.yahooapis.jp/ShoppingWebService/V3/itemSearch';

interface YahooHit {
  name?: string;
  url?: string;
  janCode?: string;
  price?: number;
  brand?: { name?: string };
  image?: { medium?: string; small?: string };
  exImage?: { url?: string };
  genreCategory?: { name?: string };
}

interface YahooResponse {
  hits?: YahooHit[];
}

function firstHit(hits: YahooHit[] | undefined): YahooHit | undefined {
  if (!hits || hits.length === 0) return undefined;
  return hits.find((hit) => Boolean(hit.name || hit.image?.medium || hit.image?.small || hit.exImage?.url)) ?? hits[0];
}

export const yahooShoppingProvider: ProductLookupProvider = {
  id: 'yahoo-shopping',
  rank: (language) => marketplaceRank('ja', language),

  async fetch(ctx: LookupContext): Promise<ProviderOutcome> {
    if (!YAHOO_SHOPPING_APP_ID) return { kind: 'miss' };

    const jan = normalizeBarcode(ctx.barcode);
    const url =
      `${ENDPOINT}?appid=${encodeURIComponent(YAHOO_SHOPPING_APP_ID)}` +
      `&jan_code=${encodeURIComponent(jan)}&results=1`;

    let response: Response;
    try {
      response = await fetch(url, {
        headers: { 'User-Agent': USER_AGENT },
        signal: ctx.signal,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Network request failed';
      return { kind: 'error', message };
    }

    if (response.status === 404) return { kind: 'miss' };
    if (!response.ok) {
      return { kind: 'error', message: `yahoo-shopping responded with status ${response.status}` };
    }

    let data: YahooResponse;
    try {
      data = await response.json();
    } catch {
      return { kind: 'error', message: 'Could not parse yahoo-shopping response' };
    }

    const hit = firstHit(data.hits);
    if (!hit) return { kind: 'miss' };

    const imageUrl = hit.exImage?.url || hit.image?.medium || hit.image?.small;
    const name = hit.name?.trim();
    const brand = hit.brand?.name?.trim();

    return {
      kind: 'hit',
      slice: {
        sourceId: 'yahoo-shopping',
        identity: name || brand || imageUrl ? { name, brand, imageUrl } : undefined,
        shopping: {
          price: typeof hit.price === 'number' ? hit.price : undefined,
          currency: typeof hit.price === 'number' ? 'JPY' : undefined,
          category: hit.genreCategory?.name,
          url: hit.url,
          attribution: 'Yahoo! Shopping',
        },
      },
    };
  },
};
