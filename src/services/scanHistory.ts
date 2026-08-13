import AsyncStorage from '@react-native-async-storage/async-storage';
import { File } from 'expo-file-system';
import { getPremiumDevOverride } from '../premium/premiumPreference';
import { isDuplicateScansEnabled, isHistorySavingEnabled } from './historyPreference';
import type { ScanHistoryEntry } from '../types/history';

const STORAGE_KEY = '@beep/scan_history';
export const FREE_MAX_ENTRIES = 30;
export const PREMIUM_MAX_ENTRIES = 100;

function isSameScan(a: ScanHistoryEntry, b: ScanHistoryEntry): boolean {
  if (a.kind === 'product' && b.kind === 'product') return a.barcode === b.barcode;
  if (a.kind === 'qr' && b.kind === 'qr') return a.data === b.data;
  if (a.kind === 'document' && b.kind === 'document') return a.pageTexts.join('\n') === b.pageTexts.join('\n');
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

/** Removes specific pages (by index) from a saved document entry, deleting
 * their image files from disk too — used by the document gallery's bulk
 * delete. Deletes the whole entry once no pages are left. Returns the
 * entry's remaining page count so the caller can decide how to navigate
 * (collapse to the single-page Detail view, or close out entirely). */
export async function removeDocumentPages(timestamp: number, pageIndexes: number[]): Promise<number> {
  const existing = await getHistory();
  const entry = existing.find((e) => e.kind === 'document' && e.timestamp === timestamp) as
    | Extract<ScanHistoryEntry, { kind: 'document' }>
    | undefined;
  if (!entry) return 0;

  const removeSet = new Set(pageIndexes);
  const keptImageUris: string[] = [];
  const keptPageTexts: string[] = [];
  entry.imageUris.forEach((uri, index) => {
    if (removeSet.has(index)) {
      try {
        new File(uri).delete();
      } catch {
        // Best-effort — a file that's already missing shouldn't block removing the page's record.
      }
      return;
    }
    keptImageUris.push(uri);
    keptPageTexts.push(entry.pageTexts[index] ?? '');
  });

  if (keptImageUris.length === 0) {
    await deleteHistoryEntry('document', timestamp);
    return 0;
  }

  const next = existing.map((e) =>
    e.kind === 'document' && e.timestamp === timestamp
      ? { ...e, imageUris: keptImageUris, pageTexts: keptPageTexts }
      : e
  );
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  return keptImageUris.length;
}
