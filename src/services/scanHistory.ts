import AsyncStorage from '@react-native-async-storage/async-storage';
import type { ScanHistoryEntry } from '../types/history';

const STORAGE_KEY = '@beep/scan_history';
const MAX_ENTRIES = 100;

export async function getHistory(): Promise<ScanHistoryEntry[]> {
  const raw = await AsyncStorage.getItem(STORAGE_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>[];
    // Entries saved before the product/qr split have no `kind` — treat them as product entries.
    return parsed.map((entry) => (entry.kind ? entry : { ...entry, kind: 'product' })) as ScanHistoryEntry[];
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

/** Entries are identified by (kind, timestamp) — the same pair HistoryScreen
 * already uses as its list key — since there's no separate id field. */
export async function setEntryFolder(
  kind: ScanHistoryEntry['kind'],
  timestamp: number,
  folderId: string | null
): Promise<void> {
  const existing = await getHistory();
  const next = existing.map((entry) =>
    entry.kind === kind && entry.timestamp === timestamp ? { ...entry, folderId: folderId ?? undefined } : entry
  );
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
}

/** Unfiles every entry in a folder that's about to be deleted — the
 * entries themselves stay, only the folder reference is cleared. */
export async function clearFolderFromEntries(folderId: string): Promise<void> {
  const existing = await getHistory();
  const next = existing.map((entry) => (entry.folderId === folderId ? { ...entry, folderId: undefined } : entry));
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
}

export async function deleteHistoryEntry(kind: ScanHistoryEntry['kind'], timestamp: number): Promise<void> {
  const existing = await getHistory();
  const next = existing.filter((entry) => !(entry.kind === kind && entry.timestamp === timestamp));
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
}
