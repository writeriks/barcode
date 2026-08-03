import AsyncStorage from '@react-native-async-storage/async-storage';

export type ThemePreference = 'light' | 'dark' | null;

const STORAGE_KEY = '@beep/theme_override';

/** The user's manually-picked theme, if they ever set one — null means
 * "follow the device's light/dark setting" (the default). */
export async function getThemeOverride(): Promise<ThemePreference> {
  const stored = await AsyncStorage.getItem(STORAGE_KEY);
  return stored === 'light' || stored === 'dark' ? stored : null;
}

/** Pass null to clear the override and go back to following the system
 * setting. */
export async function setThemeOverride(preference: ThemePreference): Promise<void> {
  if (preference) {
    await AsyncStorage.setItem(STORAGE_KEY, preference);
  } else {
    await AsyncStorage.removeItem(STORAGE_KEY);
  }
}
