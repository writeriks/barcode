import ExpoModulesCore
import VisionKit
import Vision
import UIKit

internal final class NoCurrentViewController: Exception {
  override var reason: String { "No current view controller to present the document scanner from" }
}

internal final class DocumentScannerUnsupported: Exception {
  override var reason: String { "VNDocumentCameraViewController isn't supported on this device" }
}

// Not a real failure — the user closed the scanner without capturing a
// page. Thrown as a rejection (Expo Modules has no "resolve as null from
// a delegate callback" shortcut) and caught by name on the JS side in
// index.ts, which turns it back into a plain `null` resolution instead of
// surfacing an error to the caller.
internal final class DocumentScanCancelled: Exception {
  override var reason: String { "Document scan was cancelled" }
}

internal final class DocumentScanFailed: Exception {
  override var reason: String { "Document scanner failed" }
}

internal final class PageEncodingFailed: Exception {
  override var reason: String { "Could not save a scanned page" }
}

internal final class ImageLoaderNotFound: Exception {
  override var reason: String { "Image Loader module not found" }
}

internal final class FailedToLoadImage: Exception {
  override var reason: String { "Could not load the image" }
}

internal final class TextRecognitionFailed: Exception {
  override var reason: String { "Vision framework failed to run text recognition" }
}

/// Three on-device capabilities, all backed by Apple frameworks — no
/// network call, no third-party service:
///  - `scanDocumentAsync`: presents VisionKit's document camera (the same
///    auto-edge-detection/perspective-correction UI as Notes/Files) and
///    saves each captured page as a JPEG under the app's Documents
///    directory, returning their file:// URIs.
///  - `recognizeTextAsync`: runs Vision's VNRecognizeTextRequest OCR on a
///    single image and returns the recognized lines joined with `\n`.
///  - `shareFilesAsync`: presents the system share sheet for *several*
///    files at once. Neither expo-sharing's `shareAsync(url:)` nor React
///    Native's `Share.share({url})` accepts more than one file, but
///    UIActivityViewController takes an array natively — this exposes
///    that so a multi-page scan can be shared in one go.
public class ExpoDocumentScannerModule: Module {
  // Keeps the delegate alive for the duration of the scan — VisionKit
  // only holds a weak reference to `documentCameraViewController.delegate`.
  private var scanDelegate: DocumentScanDelegate?

  public func definition() -> ModuleDefinition {
    Name("ExpoDocumentScanner")

    AsyncFunction("scanDocumentAsync") { (promise: Promise) in
      DispatchQueue.main.async {
        guard VNDocumentCameraViewController.isSupported else {
          promise.reject(DocumentScannerUnsupported())
          return
        }
        guard let currentViewController = self.appContext?.utilities?.currentViewController() else {
          promise.reject(NoCurrentViewController())
          return
        }

        let controller = VNDocumentCameraViewController()
        let delegate = DocumentScanDelegate(promise: promise) { [weak self] in
          self?.scanDelegate = nil
        }
        self.scanDelegate = delegate
        controller.delegate = delegate
        currentViewController.present(controller, animated: true)
      }
    }

    AsyncFunction("recognizeTextAsync") { (url: URL, promise: Promise) in
      guard let imageLoader = self.appContext?.imageLoader else {
        promise.reject(ImageLoaderNotFound())
        return
      }

      imageLoader.loadImage(for: url) { error, image in
        guard error == nil, let cgImage = image?.cgImage else {
          promise.reject(FailedToLoadImage())
          return
        }

        let request = VNRecognizeTextRequest()
        request.recognitionLevel = .accurate
        request.usesLanguageCorrection = true
        // Every language Blippo's UI ships in — Vision uses this list to
        // pick the best-matching recognizer instead of assuming English.
        request.recognitionLanguages = ["en-US", "tr-TR", "pl-PL", "es-ES", "fr-FR", "it-IT", "de-DE"]
        if #available(iOS 16.0, *) {
          request.automaticallyDetectsLanguage = true
        }

        let handler = VNImageRequestHandler(cgImage: cgImage, options: [:])
        do {
          try handler.perform([request])
          let lines = (request.results ?? []).compactMap { $0.topCandidates(1).first?.string }
          promise.resolve(lines.joined(separator: "\n"))
        } catch {
          promise.reject(TextRecognitionFailed())
        }
      }
    }

    AsyncFunction("shareFilesAsync") { (urls: [URL], promise: Promise) in
      DispatchQueue.main.async {
        // Nothing selected is a no-op, not an error — the caller guards
        // this too, but an empty share sheet would be nonsense either way.
        guard !urls.isEmpty else {
          promise.resolve()
          return
        }
        guard let currentViewController = self.appContext?.utilities?.currentViewController() else {
          promise.reject(NoCurrentViewController())
          return
        }

        let controller = UIActivityViewController(activityItems: urls, applicationActivities: nil)

        // On iPad UIKit *raises* if a popover-presented sheet has no anchor,
        // and this app still runs there in iPhone compatibility mode (it's
        // `supportsTablet: false`, not iPad-blocked) — Apple even reviews it
        // on an iPad. Anchor to the bottom-center, near the share button
        // that triggered this, with no arrow.
        if let popover = controller.popoverPresentationController {
          let bounds = currentViewController.view.bounds
          popover.sourceView = currentViewController.view
          popover.sourceRect = CGRect(x: bounds.midX, y: bounds.maxY, width: 0, height: 0)
          popover.permittedArrowDirections = []
        }

        // Resolves once the sheet is done — shared, or dismissed without
        // sharing. Both are ordinary outcomes, so neither is an error.
        controller.completionWithItemsHandler = { _, _, _, _ in
          promise.resolve()
        }

        currentViewController.present(controller, animated: true)
      }
    }
  }
}

private final class DocumentScanDelegate: NSObject, VNDocumentCameraViewControllerDelegate {
  private let promise: Promise
  private let onFinished: () -> Void

  init(promise: Promise, onFinished: @escaping () -> Void) {
    self.promise = promise
    self.onFinished = onFinished
  }

  func documentCameraViewController(
    _ controller: VNDocumentCameraViewController,
    didFinishWith scan: VNDocumentCameraScan
  ) {
    controller.dismiss(animated: true)
    onFinished()

    do {
      // Shared per scan session so a multi-page scan's files sort/group
      // together (Blippo-<session>-p1.jpg, -p2.jpg, ...) instead of each
      // page getting its own unrelated UUID — matters once these are
      // browsable in the Files app.
      let sessionId = "\(DocumentScanDelegate.dateFormatter.string(from: Date()))-\(DocumentScanDelegate.shortId())"
      var uris: [String] = []
      for pageIndex in 0..<scan.pageCount {
        let image = scan.imageOfPage(at: pageIndex)
        uris.append(try DocumentScanDelegate.savePage(image, index: pageIndex, sessionId: sessionId).absoluteString)
      }
      promise.resolve(uris)
    } catch {
      promise.reject(PageEncodingFailed())
    }
  }

  func documentCameraViewControllerDidCancel(_ controller: VNDocumentCameraViewController) {
    controller.dismiss(animated: true)
    onFinished()
    promise.reject(DocumentScanCancelled())
  }

  func documentCameraViewController(_ controller: VNDocumentCameraViewController, didFailWithError error: Error) {
    controller.dismiss(animated: true)
    onFinished()
    promise.reject(DocumentScanFailed())
  }

  private static let dateFormatter: DateFormatter = {
    let formatter = DateFormatter()
    formatter.dateFormat = "yyyyMMdd-HHmmss"
    return formatter
  }()

  private static func shortId() -> String {
    String(UUID().uuidString.prefix(6))
  }

  /// Application Support, deliberately, rather than Documents. Both
  /// persist for the life of the install (unlike Caches/tmp, which iOS
  /// purges when it wants space — no good for pages backing a saved
  /// History entry), but Documents is the directory `UIFileSharingEnabled`
  /// exposes to the Files app and to Finder, and that exposure is
  /// all-or-nothing per app. Keeping scans out of it means the only way a
  /// page leaves the app is through a share the app initiated.
  ///
  /// Named `Blippo-<date-time>-<shortId>-p<page>.jpg` rather than a bare
  /// UUID so a page still arrives somewhere legible once it *is* shared.
  private static func savePage(_ image: UIImage, index: Int, sessionId: String) throws -> URL {
    guard let data = image.jpegData(compressionQuality: 0.85) else {
      throw PageEncodingFailed()
    }
    let directory = FileManager.default
      .urls(for: .applicationSupportDirectory, in: .userDomainMask)[0]
      .appendingPathComponent("DocumentScans", isDirectory: true)
    // Application Support isn't created for us the way Documents is.
    try FileManager.default.createDirectory(at: directory, withIntermediateDirectories: true)
    let url = directory.appendingPathComponent("Blippo-\(sessionId)-p\(index + 1).jpg")
    try data.write(to: url)
    return url
  }
}
