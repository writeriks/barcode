import { getPremiumSetting, setPremiumSetting } from './premiumSetting';

const HISTORY_SAVING_KEY = '@beep/history_saving_enabled';
const DUPLICATE_SCANS_KEY = '@beep/history_duplicate_scans_enabled';

/** Both default to on — history has always been saved unconditionally
 * until now, and duplicate scans have always created a new entry. Both are
 * premium-only, so a lapsed subscription reads as on again rather than
 * leaving someone unable to turn their own history back on (see
 * premiumSetting). */
export const isHistorySavingEnabled = (): Promise<boolean> => getPremiumSetting(HISTORY_SAVING_KEY, true);
export const isDuplicateScansEnabled = (): Promise<boolean> => getPremiumSetting(DUPLICATE_SCANS_KEY, true);

export async function setHistorySavingEnabled(enabled: boolean): Promise<void> {
  await setPremiumSetting(HISTORY_SAVING_KEY, enabled);
}

export async function setDuplicateScansEnabled(enabled: boolean): Promise<void> {
  await setPremiumSetting(DUPLICATE_SCANS_KEY, enabled);
}
