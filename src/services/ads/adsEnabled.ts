let adsEnabled = true;

/** Flip off once a premium entitlement is active — synced from
 * PremiumContext (src/premium) whenever isPremium changes. Premium is
 * currently backed by a local dev override rather than a real purchase
 * flow (see premiumPreference.ts), but this is the same switch a real
 * RevenueCat integration would flip later. */
export function setAdsEnabled(enabled: boolean): void {
  adsEnabled = enabled;
}

export function areAdsEnabled(): boolean {
  return adsEnabled;
}
