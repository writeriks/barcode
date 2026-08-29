import { PREMIUM_SETTINGS, getPremiumSetting, setPremiumSetting } from './premiumSetting';

/** Both default to on — history has always been saved unconditionally,
 * and duplicate scans have always created a new entry. Both are
 * premium-only, so on is also the free tier's fixed position: nobody ends
 * up unable to turn their own history back on (see premiumSetting). */
export const isHistorySavingEnabled = (): Promise<boolean> => getPremiumSetting(PREMIUM_SETTINGS.historySaving);
export const isDuplicateScansEnabled = (): Promise<boolean> => getPremiumSetting(PREMIUM_SETTINGS.duplicateScans);

export async function setHistorySavingEnabled(enabled: boolean): Promise<void> {
  await setPremiumSetting(PREMIUM_SETTINGS.historySaving, enabled);
}

export async function setDuplicateScansEnabled(enabled: boolean): Promise<void> {
  await setPremiumSetting(PREMIUM_SETTINGS.duplicateScans, enabled);
}
