const SHOW_EVERY_N_SCANS = 2;
let scanCount = 0;

/** Call once per completed scan. Returns true on every Nth call — the
 * signal to show the interstitial now. */
export function shouldShowInterstitialForScan(): boolean {
  scanCount += 1;
  return scanCount % SHOW_EVERY_N_SCANS === 0;
}
