import AsyncStorage from '@react-native-async-storage/async-storage';

const BATCH_SCAN_KEY = '@beep/batch_scan_enabled';

/** Off by default — batch scanning skips the normal per-scan result
 * screen, which would be a surprising change of behavior to turn on
 * silently. */
export async function isBatchScanEnabled(): Promise<boolean> {
  const stored = await AsyncStorage.getItem(BATCH_SCAN_KEY);
  return stored === 'true';
}

export async function setBatchScanEnabled(enabled: boolean): Promise<void> {
  await AsyncStorage.setItem(BATCH_SCAN_KEY, String(enabled));
}
