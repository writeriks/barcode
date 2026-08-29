import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import type { ShareFormat } from '../components/ShareFormatSheet';
import { buildPdf, canShareSeveralFiles, existingPages } from './documentShare';
import { withSystemUi } from './systemUiSession';
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
 * What one document's PDF is called inside a batch.
 *
 * Every PDF is written to the same temporary directory under its own name,
 * so two documents sharing one — two unnamed scans, or two renamed the
 * same — would have the second quietly overwrite the first and go out
 * twice. Numbering the duplicates keeps them distinct without putting a
 * suffix on the single-document case, which is the usual one.
 */
function pdfName(documents: ScanHistoryEntry[], index: number): string {
  const base = documents[index].label?.trim() || 'Blippo';
  const earlierWithSameName = documents
    .slice(0, index)
    .filter((document) => (document.label?.trim() || 'Blippo') === base).length;
  return earlierWithSameName > 0 ? `${base} ${earlierWithSameName + 1}` : base;
}

/**
 * Shares a selection of history entries — what similar scanner apps call
 * "export".
 *
 * Scans and codes go out as a CSV. Documents go out as their pages, or as
 * a PDF of them if that's what was asked for — never as their OCR text,
 * which in a spreadsheet column would hand out the words of a document the
 * user only meant to send the pictures of. One PDF per document, since two
 * scans that happen to be selected together are still two documents.
 *
 * A mixed selection needs both in one sheet, which rules out the JS
 * sharing APIs (each takes exactly one file). The native module's
 * UIActivityViewController wrapper takes an array, and a CSV is just
 * another file to it, so everything goes in one call. Where that module
 * isn't there — Android, Expo Go — a selection with documents in it falls
 * back to the CSV of everything else.
 */
export async function shareHistoryEntries(entries: ScanHistoryEntry[], format: ShareFormat): Promise<void> {
  const exportable = entries.filter(isExportable);
  const documents = entries.filter((entry) => entry.kind === 'document');

  if (documents.length > 0 && canShareSeveralFiles()) {
    const attachments =
      format === 'pdf'
        ? (await Promise.all(documents.map((document, index) => buildPdf(document.imageUris, pdfName(documents, index)))))
            .filter((uri): uri is string => uri !== null)
        : existingPages(documents.flatMap((document) => document.imageUris));

    const files = exportable.length > 0 ? [...attachments, writeCsv(exportable).uri] : attachments;
    if (files.length === 0) return;
    const { shareFilesAsync } = await import('expo-document-scanner');
    await withSystemUi(() => shareFilesAsync(files));
    return;
  }

  if (exportable.length === 0) return;

  const file = writeCsv(exportable);
  const canShare = await Sharing.isAvailableAsync();
  if (!canShare) return;
  await withSystemUi(() =>
    Sharing.shareAsync(file.uri, { mimeType: 'text/csv', UTI: 'public.comma-separated-values-text' })
  );
}
