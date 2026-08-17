import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { PaywallScreen } from '../screens/PaywallScreen';
import { setAdsEnabled } from '../services/ads/adsEnabled';
import { getPremiumDevOverride, setPremiumDevOverride } from './premiumPreference';
import { setPremiumActive } from './premiumState';
import { configurePurchases, fetchIsPremium, subscribeToPremiumChanges } from './revenueCat';

/** What sent the user here, so the pitch can lead with the thing they
 * were just stopped from doing rather than a generic headline. */
export type PaywallReason = 'documentScans' | 'history' | 'settings' | 'qrTypes' | 'general';

interface PremiumContextValue {
  isPremium: boolean;
  isReady: boolean;
  setPremium: (enabled: boolean) => void;
  openPaywall: (reason?: PaywallReason) => void;
}

const PremiumContext = createContext<PremiumContextValue | null>(null);

/** Whether the current user has premium access, plus a way to trigger the
 * paywall from anywhere — the modal itself lives here too, mounted once,
 * so no screen needs to own its own paywall state.
 *
 * `isPremium` is `isEntitled || devOverride`: `isEntitled` comes from
 * RevenueCat (see premium/revenueCat.ts) and reflects a real purchase;
 * `devOverride` is the `__DEV__`-only Settings toggle (premiumPreference.ts)
 * that lets premium be tested on the simulator, where StoreKit's sandbox
 * doesn't work. */
export function PremiumProvider({ children }: { children: ReactNode }) {
  const [isEntitled, setIsEntitled] = useState(false);
  const [devOverride, setDevOverrideState] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [isPaywallVisible, setIsPaywallVisible] = useState(false);
  const [paywallReason, setPaywallReason] = useState<PaywallReason>('general');

  const isPremium = isEntitled || devOverride;

  useEffect(() => {
    let unsubscribe: (() => void) | undefined;
    let cancelled = false;

    (async () => {
      await configurePurchases();
      const [entitled, override] = await Promise.all([fetchIsPremium(), getPremiumDevOverride()]);
      if (cancelled) return;
      setIsEntitled(entitled);
      setDevOverrideState(override);
      setIsReady(true);

      const unsub = await subscribeToPremiumChanges(setIsEntitled);
      if (cancelled) unsub();
      else unsubscribe = unsub;
    })();

    return () => {
      cancelled = true;
      unsubscribe?.();
    };
  }, []);

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
  // async event arrives.
  const handlePurchased = useCallback(() => {
    setIsEntitled(true);
    setIsPaywallVisible(false);
  }, []);

  const value = useMemo(
    () => ({ isPremium, isReady, setPremium, openPaywall }),
    [isPremium, isReady, setPremium, openPaywall]
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
