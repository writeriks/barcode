import AsyncStorage from '@react-native-async-storage/async-storage';
import * as LocalAuthentication from 'expo-local-authentication';

const APP_LOCK_KEY = '@beep/app_lock_enabled';

export async function isAppLockEnabled(): Promise<boolean> {
  const stored = await AsyncStorage.getItem(APP_LOCK_KEY);
  return stored === 'true';
}

export async function setAppLockEnabled(enabled: boolean): Promise<void> {
  await AsyncStorage.setItem(APP_LOCK_KEY, String(enabled));
}

/** True only if the device actually has Face ID/Touch ID/a passcode set up
 * — turning the setting on without this would lock the user out with no
 * way to ever authenticate back in. */
export async function isDeviceLockSupported(): Promise<boolean> {
  const hasHardware = await LocalAuthentication.hasHardwareAsync();
  if (!hasHardware) return false;
  return LocalAuthentication.isEnrolledAsync();
}

export async function authenticateAppUnlock(promptMessage: string): Promise<boolean> {
  const result = await LocalAuthentication.authenticateAsync({ promptMessage });
  return result.success;
}
