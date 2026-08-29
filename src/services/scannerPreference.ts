import { PREMIUM_SETTINGS, getPremiumSetting, setPremiumSetting } from './premiumSetting';

/** Off by default — batch scanning skips the normal per-scan result
 * screen, which would be a surprising change of behavior to turn on
 * silently. That also makes off the free tier's fixed position: batch mode
 * left on with the row locked would be an app whose result screen the user
 * cannot get back (see premiumSetting). */
export async function isBatchScanEnabled(): Promise<boolean> {
  return getPremiumSetting(PREMIUM_SETTINGS.batchScan);
}

export async function setBatchScanEnabled(enabled: boolean): Promise<void> {
  await setPremiumSetting(PREMIUM_SETTINGS.batchScan, enabled);
}
