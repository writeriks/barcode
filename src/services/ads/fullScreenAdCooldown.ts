/**
 * Shared quiet time after any full-screen ad — App Open and interstitial
 * both write here, so opening the app and then leaving a result cannot
 * stack two of them thirty seconds apart.
 *
 * How often each format is *allowed* to ask is still its own business
 * (interstitial's lifetime warm-up, App Open's four-hour resume gap).
 * This is only the stamp they share.
 */

/** Same minute the interstitial already used, now the common gap. */
export const FULL_SCREEN_AD_COOLDOWN_MS = 60 * 1000;

let lastShownAt = 0;

export function canShowFullScreenAd(minGapMs = FULL_SCREEN_AD_COOLDOWN_MS, now = Date.now()): boolean {
  return lastShownAt === 0 || now - lastShownAt >= minGapMs;
}

/** Call right after a full-screen ad has actually been put on screen. */
export function recordFullScreenAdShown(now = Date.now()): void {
  lastShownAt = now;
}

/** Testing seam — the stamp lives for the life of the process. */
export function resetFullScreenAdCooldown(): void {
  lastShownAt = 0;
}
