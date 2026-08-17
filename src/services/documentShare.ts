import { File } from 'expo-file-system';
import { Platform } from 'react-native';
import { isExpoGo } from './ads/environment';

/** Of the given page files, the ones still on disk. A page deleted from
 * underneath its entry would otherwise reach the share sheet as a URL
 * pointing at nothing. */
export function existingPages(uris: string[]): string[] {
  return uris.filter((uri) => {
    try {
      return new File(uri).exists;
    } catch {
      return false;
    }
  });
}

/** Whether several files can be shared in one go on this build. Neither
 * expo-sharing's `shareAsync(url:)` nor React Native's `Share.share({url})`
 * takes more than one file, so multi-file sharing goes through the local
 * native module's UIActivityViewController wrapper — which exists only in
 * an iOS build that has it linked in, never under Expo Go. */
export function canShareSeveralFiles(): boolean {
  return Platform.OS === 'ios' && !isExpoGo();
}

/** Hands a document's pages to the system share sheet. Rejects rather than
 * doing nothing when the native module isn't there, so callers can say so
 * instead of leaving a button that looks dead. */
export async function shareFiles(uris: string[]): Promise<void> {
  const files = existingPages(uris);
  if (files.length === 0) return;
  const { shareFilesAsync } = await import('expo-document-scanner');
  await shareFilesAsync(files);
}

/** A filename the OS and every destination will accept: no separators, no
 * characters that need escaping somewhere down the line, and never empty. */
function toFileName(name: string): string {
  const cleaned = name
    .replace(/[^\p{L}\p{N} _-]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 60);
  return `${cleaned || 'Blippo'}.pdf`;
}

/** Renders the given pages into one PDF and opens the share sheet on it,
 * which is where "Save to Files" lives. */
export async function sharePdf(uris: string[], name: string): Promise<void> {
  const files = existingPages(uris);
  if (files.length === 0) return;
  const { createPdfAsync, shareFilesAsync } = await import('expo-document-scanner');
  const pdfUri = await createPdfAsync(files, toFileName(name));
  await shareFilesAsync([pdfUri]);
}
