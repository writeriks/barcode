import type { QrContentType } from '../utils/classifyQrContent';
import type { Product } from './product';

export type ScanHistoryStatus = 'found' | 'incomplete' | 'not-found';

/** A snapshot of one resolved scan. Stores the product data as it looked
 * at scan time — this is a historical record, not a live re-fetch.
 * `folderId` is absent/undefined for unfiled entries, including every
 * entry saved before folders existed. */
export type ScanHistoryEntry =
  | {
      kind: 'product';
      barcode: string;
      timestamp: number;
      status: ScanHistoryStatus;
      product?: Product;
      folderId?: string;
    }
  | { kind: 'qr'; timestamp: number; data: string; contentType: QrContentType; folderId?: string }
  // pageTexts[i] is the OCR text for imageUris[i] — kept per-page (not
  // joined into one string) so reopening the document and swiping to a
  // different page shows that page's own extracted text.
  | { kind: 'document'; timestamp: number; pageTexts: string[]; imageUris: string[]; folderId?: string };
