import ExpoModulesCore
import Vision

// Same error shape expo-camera's own scanFromURLAsync uses for the
// image-loading half of this — see its ios/Common/BarcodeExceptions.swift.
internal final class ImageLoaderNotFound: Exception {
  override var reason: String { "Image Loader module not found" }
}

internal final class FailedToLoadImage: Exception {
  override var reason: String { "Could not load the image" }
}

internal final class BarcodeDetectionFailed: Exception {
  override var reason: String { "Vision framework failed to run barcode detection" }
}

/// Detects barcodes/QR codes in a still image using Apple's Vision
/// framework (`VNDetectBarcodesRequest`, all symbologies by default) —
/// the fix for expo-camera's `scanFromURLAsync` only ever looking for QR
/// codes on iOS (it calls `CIDetector(ofType: CIDetectorTypeQRCode, ...)`
/// unconditionally and ignores the barcode-types argument it's given).
public class ExpoBarcodeVisionModule: Module {
  public func definition() -> ModuleDefinition {
    Name("ExpoBarcodeVision")

    AsyncFunction("scanFromURLAsync") { (url: URL, promise: Promise) in
      guard let imageLoader = appContext?.imageLoader else {
        promise.reject(ImageLoaderNotFound())
        return
      }

      imageLoader.loadImage(for: url) { error, image in
        guard error == nil, let cgImage = image?.cgImage else {
          promise.reject(FailedToLoadImage())
          return
        }

        let request = VNDetectBarcodesRequest()
        let handler = VNImageRequestHandler(cgImage: cgImage, options: [:])

        do {
          try handler.perform([request])
          let results = (request.results ?? []).compactMap { observation -> [String: String]? in
            guard let payload = observation.payloadStringValue else { return nil }
            return [
              "type": ExpoBarcodeVisionModule.symbologyName(observation.symbology),
              "data": payload
            ]
          }
          promise.resolve(results)
        } catch {
          promise.reject(BarcodeDetectionFailed())
        }
      }
    }
  }

  /// Maps onto the same type strings expo-camera's BarcodeType uses
  /// where there's a direct match. Vision reports UPC-A as `.ean13`
  /// (it's a proper subset — a 13-digit EAN with a leading zero), which
  /// is fine here: the app looks products up by the decoded digit
  /// string, never by this label.
  private static func symbologyName(_ symbology: VNBarcodeSymbology) -> String {
    switch symbology {
    case .qr, .microQR:
      return "qr"
    case .aztec:
      return "aztec"
    case .codabar:
      return "codabar"
    case .code39, .code39Checksum, .code39FullASCII, .code39FullASCIIChecksum:
      return "code39"
    case .code93, .code93i:
      return "code93"
    case .code128:
      return "code128"
    case .dataMatrix:
      return "datamatrix"
    case .ean8:
      return "ean8"
    case .ean13:
      return "ean13"
    case .itf14, .i2of5, .i2of5Checksum:
      return "itf14"
    case .pdf417, .microPDF417:
      return "pdf417"
    case .upce:
      return "upc_e"
    default:
      return "barcode"
    }
  }
}
