import AsyncStorage from '@react-native-async-storage/async-storage';

const VIBRATE_KEY = '@beep/scan_vibrate_enabled';
const BEEP_KEY = '@beep/scan_beep_enabled';

async function getFlag(key: string): Promise<boolean> {
  const stored = await AsyncStorage.getItem(key);
  return stored === null ? true : stored === 'true';
}

/** Both default to on, matching the reference behavior of "vibrate/beep on
 * a successful scan" being the expected out-of-the-box experience. */
export const isVibrateEnabled = (): Promise<boolean> => getFlag(VIBRATE_KEY);
export const isBeepEnabled = (): Promise<boolean> => getFlag(BEEP_KEY);

export async function setVibrateEnabled(enabled: boolean): Promise<void> {
  await AsyncStorage.setItem(VIBRATE_KEY, String(enabled));
}

export async function setBeepEnabled(enabled: boolean): Promise<void> {
  await AsyncStorage.setItem(BEEP_KEY, String(enabled));
}
