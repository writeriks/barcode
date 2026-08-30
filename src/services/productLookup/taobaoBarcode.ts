import { USER_AGENT } from '../../config/appInfo';
import { TAOBAO_LOOKUP_URL } from '../../config/lookupEnv';
import { normalizeBarcode } from './barcode';
import type { LookupContext, ProductLookupProvider, ProviderOutcome } from './types';

/** Shape the optional proxy must return. Keep this narrow — the app never
 *  talks to Taobao's signed API itself. */
interface TaobaoProxyProduct {
  title?: string;
  picUrl?: string;
  brand?: string;
  priceMin?: number | string;
  priceMax?: number | string;
}

function toNumber(value: number | string | undefined): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  }
  return undefined;
}

export const taobaoBarcodeProvider: ProductLookupProvider = {
  id: 'taobao',

  async fetch(ctx: LookupContext): Promise<ProviderOutcome> {
    if (!TAOBAO_LOOKUP_URL) return { kind: 'miss' };

    const barcode = normalizeBarcode(ctx.barcode);
    const separator = TAOBAO_LOOKUP_URL.includes('?') ? '&' : '?';
    const url = `${TAOBAO_LOOKUP_URL}${separator}barcode=${encodeURIComponent(barcode)}`;

    let response: Response;
    try {
      response = await fetch(url, {
        headers: { 'User-Agent': USER_AGENT, Accept: 'application/json' },
        signal: ctx.signal,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Network request failed';
      return { kind: 'error', message };
    }

    if (response.status === 404) return { kind: 'miss' };
    if (!response.ok) {
      return { kind: 'error', message: `taobao responded with status ${response.status}` };
    }

    let data: TaobaoProxyProduct;
    try {
      data = await response.json();
    } catch {
      return { kind: 'error', message: 'Could not parse taobao response' };
    }

    const name = data.title?.trim();
    const brand = data.brand?.trim();
    const imageUrl = data.picUrl?.trim();
    const priceMin = toNumber(data.priceMin);
    const priceMax = toNumber(data.priceMax);
    const price = priceMin ?? priceMax;
    if (!name && !imageUrl && price === undefined) return { kind: 'miss' };

    return {
      kind: 'hit',
      slice: {
        sourceId: 'taobao',
        identity: name || brand || imageUrl ? { name, brand, imageUrl } : undefined,
        shopping: {
          price,
          currency: price !== undefined ? 'CNY' : undefined,
          url: undefined,
          attribution: 'Taobao',
        },
      },
    };
  },
};
