let adsEnabled = true;

/** Flip off once a lifetime purchase / subscription entitlement is active.
 * Not wired to a real purchase flow yet — that's separate, upcoming work. */
export function setAdsEnabled(enabled: boolean): void {
  adsEnabled = enabled;
}

export function areAdsEnabled(): boolean {
  return adsEnabled;
}
