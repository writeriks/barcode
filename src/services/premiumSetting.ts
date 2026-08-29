import AsyncStorage from '@react-native-async-storage/async-storage';
import { isPremiumOrUnresolved } from '../premium/premiumState';

/**
 * The six switches premium unlocks, and the shape the app has without it.
 *
 * A free user gets exactly this table and cannot change any of it: App
 * Lock and Batch scan off, the rest on. Premium unlocks the rows and the
 * user sets them however they like — nothing here moves a switch a
 * premium user chose.
 *
 * Keeping the keys and their defaults in one place is what makes the
 * reset below a single call rather than six that can drift apart.
 */
export const PREMIUM_SETTINGS = {
  appLock: { key: '@beep/app_lock_enabled', fallback: false },
  batchScan: { key: '@beep/batch_scan_enabled', fallback: false },
  vibrate: { key: '@beep/scan_vibrate_enabled', fallback: true },
  beep: { key: '@beep/scan_beep_enabled', fallback: true },
  historySaving: { key: '@beep/history_saving_enabled', fallback: true },
  duplicateScans: { key: '@beep/history_duplicate_scans_enabled', fallback: true },
} as const;

export type PremiumSetting = (typeof PREMIUM_SETTINGS)[keyof typeof PREMIUM_SETTINGS];

/**
 * Reads one of them — the stored value with premium, the default without.
 *
 * The stored value used to be read unconditionally, so a choice made
 * during a subscription outlived it: the beep stayed off for free, and
 * someone who had turned History off could not turn it back on, because
 * the row that would do it is locked once premium ends.
 *
 * Unresolved counts as premium, so a paying user's first second is not
 * spent with their own settings undone; see isPremiumOrUnresolved.
 */
export async function getPremiumSetting({ key, fallback }: PremiumSetting): Promise<boolean> {
  if (!isPremiumOrUnresolved()) return fallback;
  const stored = await AsyncStorage.getItem(key);
  return stored === null ? fallback : stored === 'true';
}

/** Writing is not gated here — the Settings rows are what decide whether a
 *  switch can be touched at all, and they are locked without premium. */
export async function setPremiumSetting({ key }: PremiumSetting, enabled: boolean): Promise<void> {
  await AsyncStorage.setItem(key, String(enabled));
}

/**
 * Puts all six back to the table above.
 *
 * Called when a subscription is confirmed gone, so the stored values match
 * what the app is actually doing. Without it the old positions sit in
 * storage and come back the moment premium does — switches moving on
 * their own, which is not something the app should ever do to a choice the
 * user made.
 *
 * Only ever called on a *confirmed* lapse. A failed entitlement fetch
 * looks the same as "not premium" from the outside, and wiping a paying
 * user's setup because their phone had no signal at launch is not a trade
 * worth making — see PremiumContext.
 */
export async function resetPremiumSettings(): Promise<void> {
  try {
    await AsyncStorage.multiSet(
      Object.values(PREMIUM_SETTINGS).map(({ key, fallback }) => [key, String(fallback)])
    );
  } catch {
    // The reads are gated on premium too, so a failed write costs
    // correctness on the next resubscribe, not today's behaviour.
  }
}
