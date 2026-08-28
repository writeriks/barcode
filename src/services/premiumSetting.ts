import AsyncStorage from '@react-native-async-storage/async-storage';
import { isPremiumOrUnresolved } from '../premium/premiumState';

/**
 * Reads a premium-only switch, or its default when premium is not active.
 *
 * These switches are only settable with premium, but they used to be
 * *read* unconditionally — so a choice made during a subscription outlived
 * it. Someone who turned the beep off kept it off for free; and, worse,
 * someone who turned History off could not turn it back on, because the
 * row that would do it is locked once premium ends. The app was stuck in a
 * shape only premium was ever supposed to be able to put it in.
 *
 * The stored value is deliberately left alone rather than reset. Wiping it
 * would destroy a paying user's setup the first time RevenueCat is
 * unreachable at launch — the entitlement fetch is allowed to fail and the
 * app carries on as not-premium — and resubscribing would hand them back
 * an app they have to configure from scratch. Ignoring the value costs
 * nothing and undoes itself the moment premium comes back.
 *
 * Unresolved counts as premium here; see isPremiumOrUnresolved for why.
 */
export async function getPremiumSetting(key: string, fallback: boolean): Promise<boolean> {
  if (!isPremiumOrUnresolved()) return fallback;
  const stored = await AsyncStorage.getItem(key);
  return stored === null ? fallback : stored === 'true';
}

/** Writing is not gated here — the Settings rows are what decide whether a
 *  switch can be touched at all, and they are locked without premium. */
export async function setPremiumSetting(key: string, enabled: boolean): Promise<void> {
  await AsyncStorage.setItem(key, String(enabled));
}
