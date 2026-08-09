let adsEnabled = true;

type Listener = (enabled: boolean) => void;
const listeners = new Set<Listener>();

/** Flip off once a premium entitlement is active — synced from
 * PremiumContext (src/premium) whenever isPremium changes. */
export function setAdsEnabled(enabled: boolean): void {
  if (adsEnabled === enabled) return;
  adsEnabled = enabled;
  listeners.forEach((listener) => listener(enabled));
}

export function areAdsEnabled(): boolean {
  return adsEnabled;
}

/** For components that need to react live — e.g. hide an already-mounted
 * banner the instant premium activates, rather than waiting for the next
 * mount to re-check areAdsEnabled(). Returns an unsubscribe function. */
export function subscribeToAdsEnabled(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
