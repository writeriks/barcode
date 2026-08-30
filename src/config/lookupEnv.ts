/** Optional keys for extra barcode lookup providers. Unset means that
 *  provider is skipped (a miss, not an error) so a build without secrets
 *  still resolves Open Food Facts as before. */
export const YAHOO_SHOPPING_APP_ID = process.env.EXPO_PUBLIC_YAHOO_SHOPPING_APP_ID ?? '';

/** HTTPS endpoint of a server that signs and forwards Taobao's barcode
 *  API. The app never holds Taobao's App Secret. Expected:
 *  GET {url}?barcode=… → 200 `{ title, picUrl, brand?, priceMin?, priceMax? }`
 *  or 404 for a miss. */
export const TAOBAO_LOOKUP_URL = process.env.EXPO_PUBLIC_TAOBAO_LOOKUP_URL ?? '';
