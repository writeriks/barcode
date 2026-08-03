import type { QrContentType } from '../utils/classifyQrContent';
import type { Product } from './product';

export type ScanHistoryStatus = 'found' | 'incomplete' | 'not-found';

/** A snapshot of one resolved scan. Stores the product data as it looked
 * at scan time — this is a historical record, not a live re-fetch. */
export type ScanHistoryEntry =
  | { kind: 'product'; barcode: string; timestamp: number; status: ScanHistoryStatus; product?: Product }
  | { kind: 'qr'; timestamp: number; data: string; contentType: QrContentType };
