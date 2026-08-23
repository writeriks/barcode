import type { ScanHistoryEntry } from '../types/history';

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.map((item) => (typeof item === 'string' ? item : ''));
}

/** Turns whatever came out of JSON.parse into entries we can keep. A
 * missing `kind` is a product (the pre-split shape). A document missing
 * `imageUris` / `pageTexts` keeps its row instead of blowing up the list. */
export function normalizeHistoryEntries(parsed: unknown): ScanHistoryEntry[] {
  if (!Array.isArray(parsed)) return [];
  return parsed.flatMap((entry) => {
    if (!entry || typeof entry !== 'object') return [];
    const raw = entry as Record<string, unknown>;
    const kind = raw.kind ?? 'product';
    if (kind === 'document') {
      return [
        {
          ...raw,
          kind: 'document' as const,
          timestamp: typeof raw.timestamp === 'number' ? raw.timestamp : 0,
          imageUris: asStringArray(raw.imageUris).filter(Boolean),
          pageTexts: asStringArray(raw.pageTexts),
          folderId: typeof raw.folderId === 'string' ? raw.folderId : undefined,
          label: typeof raw.label === 'string' ? raw.label : undefined,
        },
      ];
    }
    return [{ ...raw, kind } as ScanHistoryEntry];
  });
}
