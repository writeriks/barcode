import AsyncStorage from '@react-native-async-storage/async-storage';

const HISTORY_SAVING_KEY = '@beep/history_saving_enabled';
const DUPLICATE_SCANS_KEY = '@beep/history_duplicate_scans_enabled';

async function getFlag(key: string): Promise<boolean> {
  const stored = await AsyncStorage.getItem(key);
  return stored === null ? true : stored === 'true';
}

/** Both default to on — history has always been saved unconditionally
 * until now, and duplicate scans have always created a new entry. */
export const isHistorySavingEnabled = (): Promise<boolean> => getFlag(HISTORY_SAVING_KEY);
export const isDuplicateScansEnabled = (): Promise<boolean> => getFlag(DUPLICATE_SCANS_KEY);

export async function setHistorySavingEnabled(enabled: boolean): Promise<void> {
  await AsyncStorage.setItem(HISTORY_SAVING_KEY, String(enabled));
}

export async function setDuplicateScansEnabled(enabled: boolean): Promise<void> {
  await AsyncStorage.setItem(DUPLICATE_SCANS_KEY, String(enabled));
}
