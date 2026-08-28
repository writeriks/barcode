import { getPremiumSetting, setPremiumSetting } from './premiumSetting';

const VIBRATE_KEY = '@beep/scan_vibrate_enabled';
const BEEP_KEY = '@beep/scan_beep_enabled';

/** Both default to on, matching the reference behavior of "vibrate/beep on
 * a successful scan" being the expected out-of-the-box experience — and
 * both are premium-only, so that default is also what a lapsed
 * subscription falls back to (see premiumSetting). */
export const isVibrateEnabled = (): Promise<boolean> => getPremiumSetting(VIBRATE_KEY, true);
export const isBeepEnabled = (): Promise<boolean> => getPremiumSetting(BEEP_KEY, true);

export async function setVibrateEnabled(enabled: boolean): Promise<void> {
  await setPremiumSetting(VIBRATE_KEY, enabled);
}

export async function setBeepEnabled(enabled: boolean): Promise<void> {
  await setPremiumSetting(BEEP_KEY, enabled);
}
