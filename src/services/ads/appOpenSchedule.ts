import AsyncStorage from '@react-native-async-storage/async-storage';
import { canShowFullScreenAd, recordFullScreenAdShown, FULL_SCREEN_AD_COOLDOWN_MS } from './fullScreenAdCooldown';

/**
 * When an App Open ad may appear, on top of the shared full-screen stamp.
 *
 * Cold start is eligible once the first install's first opening is over
 * (that one stays quiet so a new user isn't met with an ad). Resume is
 * eligible only after four hours since the last App Open — or, if none
 * has shown this process, since the process started, so backgrounding
 * during that first quiet session cannot sneak one in.
 *
 * The four-hour clock on a *loaded* creative is separate: see the hook.
 */

/** Where "the first opening already happened" lives. Plain storage, not
 *  the keychain: reinstalling is a first run again. */
const FIRST_LAUNCH_KEY = 'blippo.appOpen.firstLaunchDone';

export const APP_OPEN_RESUME_GAP_MS = 4 * 60 * 60 * 1000;

const processStartedAt = Date.now();
let lastAppOpenAt = 0;

/**
 * True when this is the first opening after install. Marks it done so
 * the next cold start is eligible. Storage failure skips the ad — the
 * right way round to be wrong on a first run.
 */
export async function consumeFirstAppOpenLaunch(): Promise<boolean> {
  try {
    const raw = await AsyncStorage.getItem(FIRST_LAUNCH_KEY);
    if (raw === 'true') return false;
    await AsyncStorage.setItem(FIRST_LAUNCH_KEY, 'true');
    return true;
  } catch {
    return true;
  }
}

export function canShowAppOpenOnResume(now = Date.now()): boolean {
  const anchor = lastAppOpenAt || processStartedAt;
  return now - anchor >= APP_OPEN_RESUME_GAP_MS;
}

export function canShowAppOpenNow(now = Date.now()): boolean {
  return canShowFullScreenAd(FULL_SCREEN_AD_COOLDOWN_MS, now);
}

export function recordAppOpenShown(now = Date.now()): void {
  lastAppOpenAt = now;
  recordFullScreenAdShown(now);
}

/** Testing seam. */
export function resetAppOpenSchedule(): void {
  lastAppOpenAt = 0;
}
