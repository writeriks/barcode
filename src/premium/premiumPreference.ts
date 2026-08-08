import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = '@beep/premium_dev_override';

/** A `__DEV__`-only manual override (see the Settings toggle), layered on
 * top of RevenueCat's real entitlement in PremiumContext — StoreKit's
 * sandbox doesn't work on the simulator, so this lets premium gating be
 * tested without a real purchase. Not used in release builds. */
export async function getPremiumDevOverride(): Promise<boolean> {
  const stored = await AsyncStorage.getItem(STORAGE_KEY);
  return stored === 'true';
}

export async function setPremiumDevOverride(enabled: boolean): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, String(enabled));
}
