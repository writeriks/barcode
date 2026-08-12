import AsyncStorage from '@react-native-async-storage/async-storage';
import { getPremiumDevOverride } from '../premium/premiumPreference';
import { isDuplicateScansEnabled, isHistorySavingEnabled } from './historyPreference';
import type { ScanHistoryEntry } from '../types/history';

const STORAGE_KEY = '@beep/scan_history';
export const FREE_MAX_ENTRIES = 30;
export const PREMIUM_MAX_ENTRIES = 100;

function isSameScan(a: ScanHistoryEntry, b: ScanHistoryEntry): boolean {
  if (a.kind === 'product' && b.kind === 'product') return a.barcode === b.barcode;
  if (a.kind === 'qr' && b.kind === 'qr') return a.data === b.data;
  if (a.kind === 'document' && b.kind === 'document') return a.text === b.text;
  return false;
}

/** Entries are identified by (kind, timestamp) — there's no separate id
 * field, and this pair is already unique enough for anything a user does
 * in one sitting. */
export interface HistoryEntryKey {
  kind: ScanHistoryEntry['kind'];
  timestamp: number;
}

function entryMatchesKey(entry: ScanHistoryEntry, key: HistoryEntryKey): boolean {
  return entry.kind === key.kind && entry.timestamp === key.timestamp;
}

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

/** Prepends the newest scan and caps the log at FREE_MAX_ENTRIES (or
 * PREMIUM_MAX_ENTRIES for premium users). Respects the "save history" and
 * "save duplicate scans" toggles — a no-op when history saving is off, and
 * a no-op when duplicates are off and this exact barcode/QR content is
 * already in the log. */
export async function addHistoryEntry(entry: ScanHistoryEntry): Promise<void> {
  if (!(await isHistorySavingEnabled())) return;

  const existing = await getHistory();
  if (!(await isDuplicateScansEnabled()) && existing.some((e) => isSameScan(e, entry))) return;

  const isPremium = await getPremiumDevOverride();
  const maxEntries = isPremium ? PREMIUM_MAX_ENTRIES : FREE_MAX_ENTRIES;
  const next = [entry, ...existing].slice(0, maxEntries);
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
}

export async function clearHistory(): Promise<void> {
  await AsyncStorage.removeItem(STORAGE_KEY);
}

export async function setEntriesFolder(keys: HistoryEntryKey[], folderId: string | null): Promise<void> {
  const existing = await getHistory();
  const next = existing.map((entry) =>
    keys.some((key) => entryMatchesKey(entry, key)) ? { ...entry, folderId: folderId ?? undefined } : entry
  );
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
}

export async function setEntryFolder(
  kind: ScanHistoryEntry['kind'],
  timestamp: number,
  folderId: string | null
): Promise<void> {
  return setEntriesFolder([{ kind, timestamp }], folderId);
}

/** Unfiles every entry in a folder that's about to be deleted — the
 * entries themselves stay, only the folder reference is cleared. */
export async function clearFolderFromEntries(folderId: string): Promise<void> {
  const existing = await getHistory();
  const next = existing.map((entry) => (entry.folderId === folderId ? { ...entry, folderId: undefined } : entry));
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
}

export async function deleteHistoryEntries(keys: HistoryEntryKey[]): Promise<void> {
  const existing = await getHistory();
  const next = existing.filter((entry) => !keys.some((key) => entryMatchesKey(entry, key)));
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
}

export async function deleteHistoryEntry(kind: ScanHistoryEntry['kind'], timestamp: number): Promise<void> {
  return deleteHistoryEntries([{ kind, timestamp }]);
}
