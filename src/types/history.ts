import type { Product } from './product';

export type ScanHistoryStatus = 'found' | 'incomplete' | 'not-found';

/** A snapshot of one resolved scan. Stores the product data as it looked
 * at scan time — this is a historical record, not a live re-fetch. */
export interface ScanHistoryEntry {
  barcode: string;
  timestamp: number;
  status: ScanHistoryStatus;
  product?: Product;
}
