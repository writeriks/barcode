import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { canShareSeveralFiles, existingPages } from './documentShare';
import type { ScanHistoryEntry } from '../types/history';

function csvEscape(value: string): string {
  return /[",\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

/** Everything a CSV row can be built from — which is everything except a
 * document, whose content is its pages rather than a value. */
type ExportableEntry = Exclude<ScanHistoryEntry, { kind: 'document' }>;

function isExportable(entry: ScanHistoryEntry): entry is ExportableEntry {
  return entry.kind !== 'document';
}

function entryToRow(entry: ExportableEntry, id: number): string[] {
  const type = entry.kind === 'product' ? 'PRODUCT' : 'QR';
  const date = new Date(entry.timestamp).toISOString();
  const data = entry.kind === 'product' ? entry.barcode : entry.data;
  const name = entry.label ?? (entry.kind === 'product' ? (entry.product?.productName ?? '') : '');
  return [String(id), type, date, data, name];
}

/** Writes the given entries to a CSV in the cache directory, returning the
 * file. Documents never appear in one — see shareHistoryEntries. */
function writeCsv(entries: ExportableEntry[]): File {
  const header = ['Id', 'Type', 'Date', 'Data', 'Name'];
  const rows = entries.map((entry, index) => entryToRow(entry, index + 1));
  const csv = [header, ...rows].map((row) => row.map(csvEscape).join(',')).join('\n');

  const file = new File(Paths.cache, 'export.csv');
  file.create({ overwrite: true });
  file.write(csv);
  return file;
}

/**
 * Shares a selection of history entries — what similar scanner apps call
 * "export".
 *
 * Scans and codes go out as a CSV. Documents go out as their pages: a
 * scanned document is its pages, and putting its OCR text in a spreadsheet
 * column would hand out the text of a document the user only meant to send
 * the images of — the same rule the single-entry share and the gallery
 * already follow.
 *
 * A mixed selection needs both in one sheet, which rules out the JS
 * sharing APIs (each takes exactly one file). The native module's
 * UIActivityViewController wrapper takes an array, and a CSV is just
 * another file to it, so everything goes in one call. Where that module
 * isn't there — Android, Expo Go — a selection with documents in it falls
 * back to the CSV of everything else.
 */
export async function shareHistoryEntries(entries: ScanHistoryEntry[]): Promise<void> {
  const exportable = entries.filter(isExportable);
  const pages = existingPages(entries.flatMap((entry) => (entry.kind === 'document' ? entry.imageUris : [])));

  if (pages.length > 0 && canShareSeveralFiles()) {
    const files = exportable.length > 0 ? [...pages, writeCsv(exportable).uri] : pages;
    const { shareFilesAsync } = await import('expo-document-scanner');
    await shareFilesAsync(files);
    return;
  }

  if (exportable.length === 0) return;

  const file = writeCsv(exportable);
  const canShare = await Sharing.isAvailableAsync();
  if (!canShare) return;
  await Sharing.shareAsync(file.uri, { mimeType: 'text/csv', UTI: 'public.comma-separated-values-text' });
}
