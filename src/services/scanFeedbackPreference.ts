import { PREMIUM_SETTINGS, getPremiumSetting, setPremiumSetting } from './premiumSetting';

/** Both default to on, matching the reference behavior of "vibrate/beep on
 * a successful scan" being the expected out-of-the-box experience — and
 * both are premium-only, so that default is also the free tier's fixed
 * position (see premiumSetting). */
export const isVibrateEnabled = (): Promise<boolean> => getPremiumSetting(PREMIUM_SETTINGS.vibrate);
export const isBeepEnabled = (): Promise<boolean> => getPremiumSetting(PREMIUM_SETTINGS.beep);

export async function setVibrateEnabled(enabled: boolean): Promise<void> {
  await setPremiumSetting(PREMIUM_SETTINGS.vibrate, enabled);
}

export async function setBeepEnabled(enabled: boolean): Promise<void> {
  await setPremiumSetting(PREMIUM_SETTINGS.beep, enabled);
}
