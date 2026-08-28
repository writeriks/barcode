import ExpoModulesCore
import UIKit
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
        guard error == nil, let image else {
          promise.reject(FailedToLoadImage())
          return
        }

        // PHPicker / HEIC images are often CIImage-backed, so `cgImage`
        // is nil even though the UIImage draws fine. Drawing into a
        // bitmap also bakes EXIF orientation into the pixels.
        guard let cgImage = ExpoBarcodeVisionModule.cgImage(from: image) else {
          promise.reject(FailedToLoadImage())
          return
        }

        let request = VNDetectBarcodesRequest()
        let handler = VNImageRequestHandler(
          cgImage: cgImage,
          orientation: ExpoBarcodeVisionModule.cgOrientation(from: image.imageOrientation),
          options: [:]
        )

        do {
          try handler.perform([request])
          let results = (request.results ?? []).compactMap { observation -> [String: String]? in
            guard let payload = observation.payloadStringValue, !payload.isEmpty else { return nil }
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

  /// The app only ever branches on "is this a QR code or not" (see
  /// ScannerScreen.tsx's onScanned call) — never on the exact symbology
  /// — so this deliberately doesn't attempt an exhaustive mapping onto
  /// expo-camera's full BarcodeType list. Fewer enum cases referenced
  /// here means fewer ways for this to not compile against whatever
  /// Vision framework version ships with the build SDK.
  private static func symbologyName(_ symbology: VNBarcodeSymbology) -> String {
    symbology == .qr ? "qr" : "barcode"
  }

  private static func cgOrientation(from orientation: UIImage.Orientation) -> CGImagePropertyOrientation {
    switch orientation {
    case .up: return .up
    case .down: return .down
    case .left: return .left
    case .right: return .right
    case .upMirrored: return .upMirrored
    case .downMirrored: return .downMirrored
    case .leftMirrored: return .leftMirrored
    case .rightMirrored: return .rightMirrored
    @unknown default: return .up
    }
  }

  private static func cgImage(from image: UIImage) -> CGImage? {
    if let cgImage = image.cgImage {
      return cgImage
    }
    let format = UIGraphicsImageRendererFormat.default()
    format.scale = image.scale
    format.opaque = true
    let renderer = UIGraphicsImageRenderer(size: image.size, format: format)
    let rendered = renderer.image { _ in
      image.draw(in: CGRect(origin: .zero, size: image.size))
    }
    return rendered.cgImage
  }
}
