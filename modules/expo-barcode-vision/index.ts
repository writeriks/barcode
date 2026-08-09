import { requireNativeModule } from 'expo-modules-core';

export interface BarcodeVisionResult {
  /** One of expo-camera's BarcodeType strings where there's a direct
   * match (e.g. 'ean13', 'qr'); 'barcode' for any Vision symbology that
   * doesn't map onto one (e.g. GS1 DataBar) — callers only ever branch on
   * whether a result is a QR code or not, so an exact match elsewhere
   * isn't load-bearing. */
  type: string;
  data: string;
}

interface ExpoBarcodeVisionModuleType {
  scanFromURLAsync(uri: string): Promise<BarcodeVisionResult[]>;
}

/**
 * iOS-only local module. Decodes every barcode/QR code Apple's Vision
 * framework (VNDetectBarcodesRequest) finds in a still image — unlike
 * expo-camera's own `scanFromURLAsync`, which on iOS is hardcoded to
 * `CIDetectorTypeQRCode` and silently ignores the barcode-types argument,
 * so a photo of an EAN-13/UPC/Code128/etc. barcode never gets found even
 * though the exact same code scans instantly from the live camera. See
 * ios/ExpoBarcodeVisionModule.swift for the native side.
 *
 * This is a local module (only exists once the app is rebuilt with it
 * linked in) — never import it at module scope in app code. Always
 * dynamically `import('expo-barcode-vision')` behind an `isExpoGo()` and
 * `Platform.OS === 'ios'` guard, the same way the ads services handle
 * native modules Expo Go doesn't have.
 */
const ExpoBarcodeVisionModule = requireNativeModule<ExpoBarcodeVisionModuleType>('ExpoBarcodeVision');

export function scanFromURLAsync(uri: string): Promise<BarcodeVisionResult[]> {
  return ExpoBarcodeVisionModule.scanFromURLAsync(uri);
}
