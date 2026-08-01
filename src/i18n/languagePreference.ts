import AsyncStorage from '@react-native-async-storage/async-storage';
import { isSupportedLanguage, type SupportedLanguage } from './index';

const STORAGE_KEY = '@beep/language_override';

/** The user's manually-picked language, if they ever set one — null means
 * "follow the device language" (the default). */
export async function getLanguageOverride(): Promise<SupportedLanguage | null> {
  const stored = await AsyncStorage.getItem(STORAGE_KEY);
  return stored && isSupportedLanguage(stored) ? stored : null;
}

/** Pass null to clear the override and go back to following the device
 * language. */
export async function setLanguageOverride(code: SupportedLanguage | null): Promise<void> {
  if (code) {
    await AsyncStorage.setItem(STORAGE_KEY, code);
  } else {
    await AsyncStorage.removeItem(STORAGE_KEY);
  }
}
