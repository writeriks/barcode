import { requireNativeModule } from 'expo-modules-core';

interface ExpoDocumentScannerModuleType {
  scanDocumentAsync(): Promise<string[]>;
  recognizeTextAsync(uri: string): Promise<string>;
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
