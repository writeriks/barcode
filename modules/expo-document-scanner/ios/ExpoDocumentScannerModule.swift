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

internal final class NoPagesToWrite: Exception {
  override var reason: String { "A PDF needs at least one page that can be read" }
}

internal final class PdfWriteFailed: Exception {
  override var reason: String { "Could not write the PDF" }
}

/// Five on-device capabilities, all backed by Apple frameworks — no
/// network call, no third-party service:
///  - `scanDocumentAsync`: presents VisionKit's document camera (the same
///    auto-edge-detection/perspective-correction UI as Notes/Files) and
///    saves each captured page as a JPEG under the app's Documents
///    directory, returning their file:// URIs.
///  - `recognizeTextAsync`: runs Vision's VNRecognizeTextRequest OCR on a
///    single image and returns the recognized lines joined with `\n`.
///  - `detectKeyInformationAsync`: runs NSDataDetector over a page's
///    recognized text and returns the phone numbers, links, email
///    addresses, dates and postal addresses in it.
///  - `createPdfAsync`: draws a scan's pages into a single PDF with
///    UIGraphicsPDFRenderer, one page at a time off disk.
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

    AsyncFunction("detectKeyInformationAsync") { (text: String, promise: Promise) in
      DispatchQueue.global(qos: .userInitiated).async {
        promise.resolve(KeyInformationDetector.detect(in: text))
      }
    }

    AsyncFunction("createPdfAsync") { (urls: [URL], fileName: String, promise: Promise) in
      // Off the main thread: this reads and re-encodes every page, and a
      // long scan would otherwise hold up the UI for the whole render.
      DispatchQueue.global(qos: .userInitiated).async {
        do {
          let url = try PdfWriter.write(pageUrls: urls, fileName: fileName)
          promise.resolve(url.absoluteString)
        } catch let exception as Exception {
          promise.reject(exception)
        } catch {
          promise.reject(PdfWriteFailed())
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

        // iPad only, deliberately. Apple requires this sheet to be anchored
        // in a popover there and UIKit raises without one — and the app does
        // run on iPad, in iPhone compatibility mode, which is where Apple
        // reviews it.
        //
        // On iPhone the default presentation is already right, and touching
        // popoverPresentationController anyway left the presentation in a
        // state its dismissal didn't fully unwind: the sheet closed but
        // something kept swallowing taps, so the screen behind it looked
        // frozen. Mirrors what expo-sharing does.
        if UIDevice.current.userInterfaceIdiom == .pad {
          let viewFrame = currentViewController.view.frame
          controller.popoverPresentationController?.sourceView = currentViewController.view
          controller.popoverPresentationController?.sourceRect = CGRect(
            x: viewFrame.midX,
            y: viewFrame.maxY,
            width: 0,
            height: 0
          )
          controller.modalPresentationStyle = .pageSheet
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

  /// Documents, not a cache/temp directory — a page backs a saved History
  /// entry, so it has to outlive the next time iOS wants disk space back.
  ///
  /// This lived in Application Support for a while, to keep it out of the
  /// directory `UIFileSharingEnabled` opens up to the Files app. That flag
  /// is gone from the Info.plist now, which makes Documents private
  /// anyway, and Application Support turned out to cost real things:
  /// expo-file-system's `Paths` can't name it, so JS had no way to rebuild
  /// these paths, and expo-sharing refuses files outside the directories
  /// it scopes to.
  ///
  /// Named `Blippo-<date-time>-<shortId>-p<page>.jpg` rather than a bare
  /// UUID so a page still arrives somewhere legible once it's shared.
  private static func savePage(_ image: UIImage, index: Int, sessionId: String) throws -> URL {
    guard let data = image.jpegData(compressionQuality: 0.85) else {
      throw PageEncodingFailed()
    }
    let directory = FileManager.default
      .urls(for: .documentDirectory, in: .userDomainMask)[0]
      .appendingPathComponent("DocumentScans", isDirectory: true)
    try FileManager.default.createDirectory(at: directory, withIntermediateDirectories: true)
    let url = directory.appendingPathComponent("Blippo-\(sessionId)-p\(index + 1).jpg")
    try data.write(to: url)
    return url
  }
}

/// Turns a scan's pages into one PDF.
///
/// Deliberately native rather than expo-print: the HTML route needs every
/// page base64-encoded into one string first, and a ten-page scan turns
/// into tens of megabytes of JavaScript string before a single byte is
/// written. `UIGraphicsPDFRenderer` reads one page at a time from disk,
/// so memory stays flat however long the document is.
private enum PdfWriter {
  /// A4 at 72dpi, the size a PDF page is measured in. Every page is drawn
  /// onto one of these rather than sized to its own image: a document that
  /// prints as a stack of same-sized sheets is the point of exporting one.
  private static let pageSize = CGSize(width: 595.2, height: 841.8)

  static func write(pageUrls: [URL], fileName: String) throws -> URL {
    // A page whose file has gone missing is skipped rather than fatal —
    // the rest of the document is still worth having.
    let images = pageUrls.compactMap { UIImage(contentsOfFile: $0.path) }
    guard !images.isEmpty else { throw NoPagesToWrite() }

    let directory = FileManager.default.temporaryDirectory
    let url = directory.appendingPathComponent(fileName)

    let renderer = UIGraphicsPDFRenderer(bounds: CGRect(origin: .zero, size: pageSize))
    do {
      try renderer.writePDF(to: url) { context in
        for image in images {
          context.beginPage()
          image.draw(in: fittedRect(for: image.size))
        }
      }
    } catch {
      throw PdfWriteFailed()
    }
    return url
  }

  /// The image centred on the page at its own aspect ratio. Scanned pages
  /// are already close to A4, so this is normally a small adjustment —
  /// but a photo of a receipt shouldn't be stretched to fill a sheet.
  private static func fittedRect(for imageSize: CGSize) -> CGRect {
    guard imageSize.width > 0, imageSize.height > 0 else {
      return CGRect(origin: .zero, size: pageSize)
    }
    let scale = min(pageSize.width / imageSize.width, pageSize.height / imageSize.height)
    let size = CGSize(width: imageSize.width * scale, height: imageSize.height * scale)
    return CGRect(
      x: (pageSize.width - size.width) / 2,
      y: (pageSize.height - size.height) / 2,
      width: size.width,
      height: size.height
    )
  }
}

/// Pulls the actionable bits out of a page of OCR'd text — phone numbers,
/// links, email addresses, dates, postal addresses.
///
/// `NSDataDetector` is the same detector that makes phone numbers tappable
/// in Mail and Messages, so this needs no model, no network call and no
/// API key: it is the "AI-looking" part of a document scanner that is
/// really just a system framework doing what it has always done.
private enum KeyInformationDetector {
  /// A link that is really an email address is reported as one — the
  /// detector folds both into `.link` with a `mailto:` scheme, and a
  /// "send an email" action is a different thing from "open a page".
  private static let mailtoScheme = "mailto"

  static func detect(in text: String) -> [[String: String]] {
    let types: NSTextCheckingResult.CheckingType = [.phoneNumber, .link, .date, .address]
    guard let detector = try? NSDataDetector(types: types.rawValue), !text.isEmpty else {
      return []
    }

    let range = NSRange(text.startIndex..<text.endIndex, in: text)
    var found: [[String: String]] = []
    // The detector can report the same number twice when it appears twice
    // in the page; a list of duplicates helps nobody.
    var seen = Set<String>()

    detector.enumerateMatches(in: text, range: range) { match, _, _ in
      guard let match, let matchRange = Range(match.range, in: text) else { return }
      let value = String(text[matchRange])
      guard let kind = kind(of: match) else { return }
      let key = "\(kind)|\(value.lowercased())"
      guard seen.insert(key).inserted else { return }
      found.append(["type": kind, "value": value])
    }

    return found
  }

  private static func kind(of match: NSTextCheckingResult) -> String? {
    switch match.resultType {
    case .phoneNumber:
      return "phone"
    case .link:
      return match.url?.scheme == mailtoScheme ? "email" : "link"
    case .date:
      return "date"
    case .address:
      return "address"
    default:
      return nil
    }
  }
}
