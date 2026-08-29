import AsyncStorage from '@react-native-async-storage/async-storage';
import { File } from 'expo-file-system';
import { isPremium, isPremiumResolved } from '../premium/premiumState';
import { resolveDocumentScanUri } from '../utils/documentScanPaths';
import { isDuplicateScansEnabled, isHistorySavingEnabled } from './historyPreference';
import { normalizeHistoryEntries } from './scanHistoryNormalize';
import type { ScanHistoryEntry } from '../types/history';

const STORAGE_KEY = '@beep/scan_history';
export const FREE_MAX_ENTRIES = 30;
export const PREMIUM_MAX_ENTRIES = 100;

function isSameScan(a: ScanHistoryEntry, b: ScanHistoryEntry): boolean {
  if (a.kind === 'product' && b.kind === 'product') return a.barcode === b.barcode;
  if (a.kind === 'qr' && b.kind === 'qr') return a.data === b.data;
  // Documents have no stable identity the way a barcode or a QR payload
  // does. Comparing OCR text treated two blank pages — or two photos of
  // the same letter — as one scan, so the second capture was dropped
  // whenever "save duplicate scans" was off.
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

function withResolvedDocumentUris(entry: ScanHistoryEntry): ScanHistoryEntry {
  if (entry.kind !== 'document') return entry;
  return { ...entry, imageUris: entry.imageUris.map(resolveDocumentScanUri) };
}

/** The log as it sits on disk — no path rewriting. Writers must go
 * through this; remapping in `getHistory` used to live inside a catch
 * that returned `[]`, so one bad document URI made the next save replace
 * the entire history with just the new scan. */
async function readStoredHistory(): Promise<ScanHistoryEntry[]> {
  const raw = await AsyncStorage.getItem(STORAGE_KEY);
  if (!raw) return [];
  try {
    return normalizeHistoryEntries(JSON.parse(raw));
  } catch {
    return [];
  }
}

async function persistHistory(entries: ScanHistoryEntry[]): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  } catch (error) {
    console.warn('[Blippo] failed to persist scan history', error);
  }
}

/**
 * Runs one read-modify-write at a time.
 *
 * Every writer below reads the whole log, changes it, and writes it back,
 * with awaits in between — so two that overlap both start from the same
 * array and the second write erases the first one's change. Batch scanning
 * is where this stopped being theoretical: it fires a save per code
 * without waiting, and a barcode's save waits on a network lookup first,
 * so a handful of codes scanned quickly landed as one entry or none. The
 * user's report was that the scans simply were not in History.
 *
 * A queue rather than a lock: callers still just await their own call, and
 * a writer that throws must not wedge the ones behind it.
 */
let historyWrites: Promise<unknown> = Promise.resolve();

function serializeHistoryWrite<T>(work: () => Promise<T>): Promise<T> {
  const run = historyWrites.then(work, work);
  historyWrites = run.catch(() => undefined);
  return run;
}

export async function getHistory(): Promise<ScanHistoryEntry[]> {
  const entries = await readStoredHistory();
  // A document's page URIs are re-pointed at the current app container
  // here, in the one place every *reader* goes through — the paths stored
  // with the entry were only ever valid for the install that wrote them.
  // Writers stay on the stored paths so a remap failure cannot wipe the log.
  return entries.map(withResolvedDocumentUris);
}

/** Prepends the newest scan and caps the log at FREE_MAX_ENTRIES (or
 * PREMIUM_MAX_ENTRIES for premium users). Respects the "save history" and
 * "save duplicate scans" toggles — a no-op when history saving is off, and
 * a no-op when duplicates are off and this exact barcode/QR content is
 * already in the log. */
export async function addHistoryEntry(entry: ScanHistoryEntry): Promise<void> {
  if (!(await isHistorySavingEnabled())) return;

  return serializeHistoryWrite(async () => {
    const existing = await readStoredHistory();
    if (!(await isDuplicateScansEnabled()) && existing.some((e) => isSameScan(e, entry))) return;

    // Trimming is destructive, so an unresolved premium state gets the
    // benefit of the doubt: scanning in the second before RevenueCat
    // answers must never cut a paying user's log down to the free cap.
    const useFreeCap = isPremiumResolved() && !isPremium();
    const next = [entry, ...existing].slice(0, useFreeCap ? FREE_MAX_ENTRIES : PREMIUM_MAX_ENTRIES);
    await persistHistory(next);
  });
}

export async function clearHistory(): Promise<void> {
  return serializeHistoryWrite(() => AsyncStorage.removeItem(STORAGE_KEY));
}

export async function setEntriesFolder(keys: HistoryEntryKey[], folderId: string | null): Promise<void> {
  return serializeHistoryWrite(async () => {
    const existing = await readStoredHistory();
    const next = existing.map((entry) =>
      keys.some((key) => entryMatchesKey(entry, key)) ? { ...entry, folderId: folderId ?? undefined } : entry
    );
    await persistHistory(next);
  });
}

export async function setEntryFolder(
  kind: ScanHistoryEntry['kind'],
  timestamp: number,
  folderId: string | null
): Promise<void> {
  return setEntriesFolder([{ kind, timestamp }], folderId);
}

/** Gives an entry a user-chosen display name, replacing the one the list
 * otherwise derives from the scan itself. An empty/whitespace label clears
 * it again, falling back to that derived name. */
export async function renameHistoryEntry(key: HistoryEntryKey, label: string): Promise<void> {
  const trimmed = label.trim();
  return serializeHistoryWrite(async () => {
    const existing = await readStoredHistory();
    const next = existing.map((entry) =>
      entryMatchesKey(entry, key) ? { ...entry, label: trimmed || undefined } : entry
    );
    await persistHistory(next);
  });
}

/** Unfiles every entry in a folder that's about to be deleted — the
 * entries themselves stay, only the folder reference is cleared. */
export async function clearFolderFromEntries(folderId: string): Promise<void> {
  return serializeHistoryWrite(async () => {
    const existing = await readStoredHistory();
    const next = existing.map((entry) => (entry.folderId === folderId ? { ...entry, folderId: undefined } : entry));
    await persistHistory(next);
  });
}

/** The delete itself, without taking the queue — so a writer that already
 *  holds it (removeDocumentPages) can reuse this instead of deadlocking on
 *  its own turn. */
async function deleteEntriesUnqueued(keys: HistoryEntryKey[]): Promise<void> {
  const existing = await readStoredHistory();
  const next = existing.filter((entry) => !keys.some((key) => entryMatchesKey(entry, key)));
  await persistHistory(next);
}

export async function deleteHistoryEntries(keys: HistoryEntryKey[]): Promise<void> {
  return serializeHistoryWrite(() => deleteEntriesUnqueued(keys));
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
  return serializeHistoryWrite(async () => {
    const existing = await readStoredHistory();
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
          new File(resolveDocumentScanUri(uri)).delete();
        } catch {
          // Best-effort — a file that's already missing shouldn't block removing the page's record.
        }
        return;
      }
      keptImageUris.push(uri);
      keptPageTexts.push(entry.pageTexts[index] ?? '');
    });

    if (keptImageUris.length === 0) {
      // The unqueued delete on purpose: this call already holds the queue.
      await deleteEntriesUnqueued([{ kind: 'document', timestamp }]);
      return 0;
    }

    const next = existing.map((e) =>
      e.kind === 'document' && e.timestamp === timestamp
        ? { ...e, imageUris: keptImageUris, pageTexts: keptPageTexts }
        : e
    );
    await persistHistory(next);
    return keptImageUris.length;
  });
}
