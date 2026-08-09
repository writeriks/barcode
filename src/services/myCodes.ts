import AsyncStorage from '@react-native-async-storage/async-storage';
import type { MyCode } from '../types/myCode';

const STORAGE_KEY = '@beep/my_codes';

export async function getMyCodes(): Promise<MyCode[]> {
  const raw = await AsyncStorage.getItem(STORAGE_KEY);
  if (!raw) return [];
  try {
    return JSON.parse(raw) as MyCode[];
  } catch {
    return [];
  }
}

export async function saveMyCode(code: MyCode): Promise<void> {
  const existing = await getMyCodes();
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify([code, ...existing]));
}

export async function deleteMyCode(id: string): Promise<void> {
  const existing = await getMyCodes();
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(existing.filter((c) => c.id !== id)));
}

/** Replaces the code with a matching id in place, preserving its position
 * in the list — unlike saveMyCode, which always inserts a new entry at
 * the front. */
export async function updateMyCode(code: MyCode): Promise<void> {
  const existing = await getMyCodes();
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(existing.map((c) => (c.id === code.id ? code : c))));
}
