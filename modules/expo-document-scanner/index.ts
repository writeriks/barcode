import { requireNativeModule } from 'expo-modules-core';

interface ExpoDocumentScannerModuleType {
  scanDocumentAsync(): Promise<string[]>;
  recognizeTextAsync(uri: string): Promise<string>;
  createPdfAsync(uris: string[], fileName: string): Promise<string>;
  shareFilesAsync(uris: string[]): Promise<void>;
}

/**
 * iOS-only local module (see ios/ExpoDocumentScannerModule.swift). Only
 * exists once the app is rebuilt with it linked in — never import it at
 * module scope in app code. Always dynamically `import('expo-document-scanner')`
 * behind an `isExpoGo()` and `Platform.OS === 'ios'` guard, the same way
 * expo-barcode-vision and the ads services handle native modules Expo Go
 * doesn't have.
 */
const ExpoDocumentScannerModule = requireNativeModule<ExpoDocumentScannerModuleType>('ExpoDocumentScanner');

/**
 * Presents Apple's VisionKit document scanner full-screen — the same
 * auto-edge-detection/perspective-correction camera UI as Notes/Files.
 * Resolves with one file:// URI per captured page (saved under the app's
 * Documents directory, so callers don't need to copy them elsewhere to
 * keep them around), or `null` if the user cancels without capturing
 * anything — that's the expected/common case, not an error.
 */
export async function scanDocumentAsync(): Promise<string[] | null> {
  try {
    return await ExpoDocumentScannerModule.scanDocumentAsync();
  } catch (error) {
    if ((error as { code?: string }).code === 'ERR_DOCUMENT_SCAN_CANCELLED') return null;
    throw error;
  }
}

/**
 * Runs Apple's on-device text recognition (VNRecognizeTextRequest) on a
 * single image and returns the recognized lines joined with `\n`. No
 * network call — everything happens on-device.
 */
export function recognizeTextAsync(uri: string): Promise<string> {
  return ExpoDocumentScannerModule.recognizeTextAsync(uri);
}

/**
 * Draws the given pages into one PDF and resolves with its file:// URI.
 *
 * Written natively rather than through expo-print because the HTML route
 * would need every page base64-encoded into a single string first — tens
 * of megabytes of JavaScript string for a long scan, before a byte is
 * written. This reads one page at a time straight off disk.
 *
 * The file lands in the temporary directory: it's a derived artifact the
 * user is about to share or save somewhere real, not something the app
 * needs to keep. Pages whose file has gone missing are skipped; it only
 * rejects when none of them can be read.
 */
export function createPdfAsync(uris: string[], fileName: string): Promise<string> {
  return ExpoDocumentScannerModule.createPdfAsync(uris, fileName);
}

/**
 * Opens the system share sheet with several local files attached at once.
 * This exists because neither of the JS-level sharing APIs can do it:
 * `expo-sharing`'s `shareAsync(url)` and React Native's
 * `Share.share({ url })` each take a single file. UIActivityViewController
 * accepts an array, so sharing every page of a multi-page scan in one
 * action only needs this thin wrapper over it.
 *
 * Resolves once the sheet closes, whether the user shared or dismissed it.
 */
export function shareFilesAsync(uris: string[]): Promise<void> {
  return ExpoDocumentScannerModule.shareFilesAsync(uris);
}
