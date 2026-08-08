import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = '@beep/premium_dev_override';

/** Temporary stand-in for real subscription state until RevenueCat (or
 * another IAP provider) is wired up — a dev-only toggle in Settings and
 * the paywall's "unlock" button both flip this, so premium gating can be
 * built and tested before real purchases exist. Once that's ready, this
 * is the one file that changes (read entitlements instead of
 * AsyncStorage) — PremiumContext and everything consuming usePremium()
 * stays the same. */
export async function getPremiumDevOverride(): Promise<boolean> {
  const stored = await AsyncStorage.getItem(STORAGE_KEY);
  return stored === 'true';
}

export async function setPremiumDevOverride(enabled: boolean): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, String(enabled));
}
