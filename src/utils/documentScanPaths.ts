import { File, Paths } from 'expo-file-system';

/** Where the native scanner writes captured pages (see
 * modules/expo-document-scanner). */
const SCANS_DIRECTORY = 'DocumentScans';

/**
 * Rebuilds a scanned page's URI against the app's *current* container.
 *
 * iOS hands the app a fresh container UUID on install and on update, so
 * the absolute `file:///.../Containers/Data/Application/<uuid>/...` path a
 * page was saved under stops resolving afterwards — the file is still
 * there, that path just isn't its path anymore. History entries keep those
 * absolute URIs, which is why pages saved before an update came back as a
 * blank image, a black fullscreen viewer, and a share that had nothing to
 * send. Apple's own guidance is to treat container URLs as good only for
 * the current launch.
 *
 * Only the filename is durable, so that's the part this keeps: strip the
 * stored path down to its last segment and put today's directory back in
 * front of it. Entries written by any earlier version heal on read without
 * needing a migration.
 */
export function resolveDocumentScanUri(storedUri: string): string {
  const fileName = storedUri.split('/').pop();
  if (!fileName) return storedUri;
  return new File(Paths.document, SCANS_DIRECTORY, fileName).uri;
}
