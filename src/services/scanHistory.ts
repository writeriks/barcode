import AsyncStorage from '@react-native-async-storage/async-storage';
import type { ScanHistoryEntry } from '../types/history';

const STORAGE_KEY = '@beep/scan_history';
const MAX_ENTRIES = 100;

export async function getHistory(): Promise<ScanHistoryEntry[]> {
  const raw = await AsyncStorage.getItem(STORAGE_KEY);
  if (!raw) return [];
  try {
    return JSON.parse(raw) as ScanHistoryEntry[];
  } catch {
    return [];
  }
}

/** Prepends the newest scan and caps the log at MAX_ENTRIES. */
export async function addHistoryEntry(entry: ScanHistoryEntry): Promise<void> {
  const existing = await getHistory();
  const next = [entry, ...existing].slice(0, MAX_ENTRIES);
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
}

export async function clearHistory(): Promise<void> {
  await AsyncStorage.removeItem(STORAGE_KEY);
}
