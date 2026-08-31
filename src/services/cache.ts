import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Product } from '../types/product';

const CACHE_KEY_PREFIX = '@barcode_cache/v2/';
const CACHE_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

interface CacheEntry {
  product: Product;
  cachedAt: number;
}

function keyFor(barcode: string, language: string): string {
  return `${CACHE_KEY_PREFIX}${language}/${barcode}`;
}

/** Returns the cached product for `barcode` in this app language, or null
 *  on a miss/expired entry. Language is part of the key so switching ja/zh
 *  can pick a different identity ranking on the next scan. */
export async function getCachedProduct(barcode: string, language: string): Promise<Product | null> {
  const raw = await AsyncStorage.getItem(keyFor(barcode, language));
  if (!raw) return null;

  let entry: CacheEntry;
  try {
    entry = JSON.parse(raw);
  } catch {
    await AsyncStorage.removeItem(keyFor(barcode, language));
    return null;
  }

  if (Date.now() - entry.cachedAt > CACHE_TTL_MS) {
    await AsyncStorage.removeItem(keyFor(barcode, language));
    return null;
  }

  return entry.product;
}

/** Caches a successfully-resolved product for 30 days. */
export async function setCachedProduct(product: Product, language: string): Promise<void> {
  const entry: CacheEntry = { product, cachedAt: Date.now() };
  await AsyncStorage.setItem(keyFor(product.code, language), JSON.stringify(entry));
}
