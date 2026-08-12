import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import type { ScanHistoryEntry } from '../types/history';

function csvEscape(value: string): string {
  return /[",\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

function entryToRow(entry: ScanHistoryEntry, id: number): string[] {
  const type = entry.kind === 'product' ? 'PRODUCT' : entry.kind === 'qr' ? 'QR' : 'DOCUMENT';
  const date = new Date(entry.timestamp).toISOString();
  const data = entry.kind === 'product' ? entry.barcode : entry.kind === 'qr' ? entry.data : entry.pageTexts.join(' | ');
  const name = entry.kind === 'product' ? (entry.product?.productName ?? '') : '';
  return [String(id), type, date, data, name];
}

/** Writes the given entries to a CSV in the cache directory and hands it to
 * the OS share sheet — mirrors what similar scanner apps call "export". */
export async function shareHistoryEntriesAsCsv(entries: ScanHistoryEntry[]): Promise<void> {
  const header = ['Id', 'Type', 'Date', 'Data', 'Name'];
  const rows = entries.map((entry, index) => entryToRow(entry, index + 1));
  const csv = [header, ...rows].map((row) => row.map(csvEscape).join(',')).join('\n');

  const file = new File(Paths.cache, 'export.csv');
  file.create({ overwrite: true });
  file.write(csv);

  const canShare = await Sharing.isAvailableAsync();
  if (!canShare) return;
  await Sharing.shareAsync(file.uri, { mimeType: 'text/csv', UTI: 'public.comma-separated-values-text' });
}
