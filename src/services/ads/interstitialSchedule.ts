/**
 * When a scan is allowed to be interrupted by a full-screen ad.
 *
 * This used to be every scan, which is the one thing it must never be:
 * scanning is what the app is for, and putting a video between pointing
 * the camera at something and seeing what it was makes the app worse at
 * its only job. It is also the textbook example of the interstitial
 * placement Google's own policy warns publishers off — an ad on every user
 * action, where the user cannot tell the ad apart from the app working.
 *
 * So the rules are now deliberately stingy, and all three must pass:
 *
 *  - never before the user has had a few scans go cleanly, so a first
 *    session is never interrupted;
 *  - never twice inside the cooldown, so a burst of scanning is one
 *    interruption at most;
 *  - never more than a couple of times in one run of the app.
 *
 * The banner on the scanner screen is what earns steadily. This is the
 * occasional top-up, and it is meant to be forgettable.
 */

/** Scans that happen before the first one is even considered. */
const WARMUP_SCANS = 8;

/** Quiet time after showing one. Ten minutes is long enough that scanning
 *  a shelf of barcodes stays one interruption. */
const COOLDOWN_MS = 10 * 60 * 1000;

/** Ceiling for a single run of the app, however long it lasts. */
const MAX_PER_SESSION = 2;

let scanCount = 0;
let shownThisSession = 0;
let lastShownAt = 0;

/**
 * Call once per completed scan. Returns whether this scan is one of the
 * rare ones allowed to show an ad.
 *
 * Asking does not spend anything — recordInterstitialShown does, and the
 * caller only gets there once an ad has really been put on screen. Keeping
 * those apart matters: an ad that failed to load used to start the
 * cooldown anyway, so a device with poor fill would quietly answer "not
 * yet" forever after.
 */
export function canShowInterstitialForScan(now = Date.now()): boolean {
  scanCount += 1;
  if (scanCount <= WARMUP_SCANS) return false;
  if (shownThisSession >= MAX_PER_SESSION) return false;
  return lastShownAt === 0 || now - lastShownAt >= COOLDOWN_MS;
}

/** Call right after an ad has actually been shown. */
export function recordInterstitialShown(now = Date.now()): void {
  shownThisSession += 1;
  lastShownAt = now;
}

/** Testing seam — the counters above live for the life of the process. */
export function resetInterstitialSchedule(): void {
  scanCount = 0;
  shownThisSession = 0;
  lastShownAt = 0;
}
