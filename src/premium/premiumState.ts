let isPremiumActive = false;
let isResolved = false;

/** Mirrors PremiumContext's `isPremium` — a real RevenueCat entitlement
 * *or* the manual testing override — for code that runs outside React and
 * can't read the context. Kept in sync from PremiumContext, the same way
 * setAdsEnabled is (see services/ads/adsEnabled.ts). */
export function setPremiumActive(active: boolean): void {
  isPremiumActive = active;
  isResolved = true;
}

export function isPremium(): boolean {
  return isPremiumActive;
}

/**
 * Whether the answer above is trustworthy yet. False for the moment
 * between launch and RevenueCat reporting back.
 *
 * Callers whose "not premium" branch destroys something — trimming the
 * history to the free cap, say — should treat unresolved as premium. The
 * two ways of being wrong aren't equal: over-granting for a second costs
 * nothing and self-corrects, while under-granting deletes entries a
 * paying user can't get back.
 */
export function isPremiumResolved(): boolean {
  return isResolved;
}
