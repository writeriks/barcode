import { getPremiumSetting, setPremiumSetting } from './premiumSetting';

const BATCH_SCAN_KEY = '@beep/batch_scan_enabled';

/** Off by default — batch scanning skips the normal per-scan result
 * screen, which would be a surprising change of behavior to turn on
 * silently. That also makes off the right thing to fall back to when
 * premium ends: batch mode left on with the row locked would be an app
 * whose results screen the user cannot get back (see premiumSetting). */
export async function isBatchScanEnabled(): Promise<boolean> {
  return getPremiumSetting(BATCH_SCAN_KEY, false);
}

export async function setBatchScanEnabled(enabled: boolean): Promise<void> {
  await setPremiumSetting(BATCH_SCAN_KEY, enabled);
}
