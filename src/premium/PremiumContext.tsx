import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { AppState } from 'react-native';
import { IS_PREMIUM_OVERRIDE_AVAILABLE } from '../config/premiumEnv';
import { PaywallScreen } from '../screens/PaywallScreen';
import { setAdsEnabled } from '../services/ads/adsEnabled';
import { getPremiumDevOverride, setPremiumDevOverride } from './premiumPreference';
import { setPremiumActive } from './premiumState';
import {
  configurePurchases,
  fetchPremiumEntitlement,
  subscribeToPremiumChanges,
  type PremiumEntitlement,
} from './revenueCat';

/** What sent the user here, so the pitch can lead with the thing they
 * were just stopped from doing rather than a generic headline. */
export type PaywallReason =
  // The one-off pitch on the way back from a new user's first result. It
  // is the only reason the user did not go looking for.
  | 'firstScan'
  | 'documentScans'
  | 'history'
  | 'settings'
  | 'customization'
  // No generator type is gated any more (see QR_PREMIUM_TYPES), but the
  // picker still knows how to lock one, so the reason it would raise stays
  // reachable rather than being deleted and reinvented later.
  | 'qrTypes'
  | 'general';

interface PremiumContextValue {
  isPremium: boolean;
  isReady: boolean;
  /** True while the store entitlement is still active but will not renew
   * (the user cancelled, or Apple won't bill again). Features stay unlocked
   * until `expirationDate` — that's the period they already paid for. */
  isCancelled: boolean;
  expirationDate: string | null;
  /** The Settings test switch, not the combined premium flag. */
  devOverride: boolean;
  setPremium: (enabled: boolean) => void;
  openPaywall: (reason?: PaywallReason) => void;
  refreshPremium: () => Promise<void>;
}

const PremiumContext = createContext<PremiumContextValue | null>(null);

const EMPTY_ENTITLEMENT: PremiumEntitlement = {
  isEntitled: false,
  willRenew: false,
  expirationDate: null,
  unsubscribeDetectedAt: null,
};

function isCancelledEntitlement(entitlement: PremiumEntitlement): boolean {
  if (!entitlement.isEntitled || entitlement.willRenew) return false;
  // Lifetime / promotional grants also report willRenew=false. Those have
  // no end date and no unsubscribe timestamp — they aren't a cancellation.
  return entitlement.expirationDate != null || entitlement.unsubscribeDetectedAt != null;
}

/** Whether the current user has premium access, plus a way to trigger the
 * paywall from anywhere — the modal itself lives here too, mounted once,
 * so no screen needs to own its own paywall state.
 *
 * `isPremium` is `isEntitled || (testing && devOverride)`: `isEntitled`
 * comes from RevenueCat (see premium/revenueCat.ts) and reflects a real
 * purchase, including a cancelled subscription that hasn't expired yet;
 * `devOverride` is the Settings toggle (premiumPreference.ts) that lets
 * premium be tested without a store, and is ignored in builds where that
 * toggle isn't offered. */
export function PremiumProvider({ children }: { children: ReactNode }) {
  const [entitlement, setEntitlement] = useState<PremiumEntitlement>(EMPTY_ENTITLEMENT);
  const [devOverride, setDevOverrideState] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [isPaywallVisible, setIsPaywallVisible] = useState(false);
  const [paywallReason, setPaywallReason] = useState<PaywallReason>('general');

  const isPremium = entitlement.isEntitled || (IS_PREMIUM_OVERRIDE_AVAILABLE && devOverride);
  const isCancelled = isCancelledEntitlement(entitlement);

  const applyEntitlement = useCallback((next: PremiumEntitlement) => {
    setEntitlement(next);
  }, []);

  const refreshPremium = useCallback(async () => {
    try {
      const next = await fetchPremiumEntitlement({ refresh: true });
      applyEntitlement(next);
    } catch {
      // Keep the last known entitlement if Apple/RevenueCat is unreachable.
    }
  }, [applyEntitlement]);

  useEffect(() => {
    let unsubscribe: (() => void) | undefined;
    let cancelled = false;

    (async () => {
      await configurePurchases();
      try {
        const [next, override] = await Promise.all([
          fetchPremiumEntitlement(),
          IS_PREMIUM_OVERRIDE_AVAILABLE ? getPremiumDevOverride() : Promise.resolve(false),
        ]);
        if (cancelled) return;
        applyEntitlement(next);
        setDevOverrideState(override);
      } catch {
        // Leave the empty default — isReady still has to flip so callers
        // aren't stuck treating unresolved as premium forever.
      }
      if (cancelled) return;
      setIsReady(true);

      const unsub = await subscribeToPremiumChanges(applyEntitlement);
      if (cancelled) unsub();
      else unsubscribe = unsub;
    })();

    return () => {
      cancelled = true;
      unsubscribe?.();
    };
  }, [applyEntitlement]);

  // Cancellation (and expiry) often happen while this app is in the
  // background — Apple's own Subscriptions screen, or the in-app manage
  // sheet. Re-read on return so Settings doesn't keep saying "Premium
  // active" from a stale cache.
  const appStateRef = useRef(AppState.currentState);
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextState) => {
      if (appStateRef.current === 'background' && nextState === 'active') {
        void refreshPremium();
      }
      appStateRef.current = nextState;
    });
    return () => subscription.remove();
  }, [refreshPremium]);

  // If the period ends while the app is sitting in the foreground, don't
  // wait for the next launch or a listener that may never fire.
  useEffect(() => {
    if (!entitlement.isEntitled || !entitlement.expirationDate) return;
    const remainingMs = new Date(entitlement.expirationDate).getTime() - Date.now();
    // setTimeout argument is a 32-bit signed int — a monthly remaining
    // period overflows and fires immediately. Refresh at expiry, or in a
    // day if that's further out, and this effect reschedules.
    const delay = Math.min(Math.max(remainingMs + 500, 0), 24 * 60 * 60 * 1000);
    const timer = setTimeout(() => {
      void refreshPremium();
    }, delay);
    return () => clearTimeout(timer);
  }, [entitlement.isEntitled, entitlement.expirationDate, refreshPremium]);

  // Ads and the history cap both run outside React and read their own
  // module-level flags rather than this context, so keep those in sync
  // here (see services/ads/adsEnabled.ts and premium/premiumState.ts).
  useEffect(() => {
    if (!isReady) return;
    setAdsEnabled(!isPremium);
    setPremiumActive(isPremium);
  }, [isPremium, isReady]);

  const setPremium = useCallback((enabled: boolean) => {
    setDevOverrideState(enabled);
    setPremiumDevOverride(enabled);
  }, []);

  const openPaywall = useCallback((reason: PaywallReason = 'general') => {
    setPaywallReason(reason);
    setIsPaywallVisible(true);
  }, []);
  const closePaywall = useCallback(() => setIsPaywallVisible(false), []);

  // RevenueCat's listener will also fire on a real purchase/restore, but
  // updating here immediately avoids a flash of the paywall before that
  // async event arrives. A refresh then fills in willRenew / expiry.
  const handlePurchased = useCallback(() => {
    setEntitlement((current) => ({
      ...current,
      isEntitled: true,
      willRenew: true,
    }));
    setIsPaywallVisible(false);
    void refreshPremium();
  }, [refreshPremium]);

  const value = useMemo(
    () => ({
      isPremium,
      isReady,
      isCancelled,
      expirationDate: entitlement.expirationDate,
      devOverride,
      setPremium,
      openPaywall,
      refreshPremium,
    }),
    [
      isPremium,
      isReady,
      isCancelled,
      entitlement.expirationDate,
      devOverride,
      setPremium,
      openPaywall,
      refreshPremium,
    ]
  );

  return (
    <PremiumContext.Provider value={value}>
      {children}
      <PaywallScreen
        visible={isPaywallVisible}
        reason={paywallReason}
        onClose={closePaywall}
        onPurchased={handlePurchased}
      />
    </PremiumContext.Provider>
  );
}

export function usePremium(): PremiumContextValue {
  const ctx = useContext(PremiumContext);
  if (!ctx) throw new Error('usePremium must be used within a PremiumProvider');
  return ctx;
}
