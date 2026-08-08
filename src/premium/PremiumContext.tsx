import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { PaywallScreen } from '../screens/PaywallScreen';
import { setAdsEnabled } from '../services/ads/adsEnabled';
import { getPremiumDevOverride, setPremiumDevOverride } from './premiumPreference';
import { configurePurchases, fetchIsPremium, subscribeToPremiumChanges } from './revenueCat';

interface PremiumContextValue {
  isPremium: boolean;
  isReady: boolean;
  setPremium: (enabled: boolean) => void;
  openPaywall: () => void;
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

  // Ads check this flag directly (see services/ads/adsEnabled.ts) rather
  // than depending on this context, so keep it in sync here.
  useEffect(() => {
    if (isReady) setAdsEnabled(!isPremium);
  }, [isPremium, isReady]);

  const setPremium = useCallback((enabled: boolean) => {
    setDevOverrideState(enabled);
    setPremiumDevOverride(enabled);
  }, []);

  const openPaywall = useCallback(() => setIsPaywallVisible(true), []);
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
      <PaywallScreen visible={isPaywallVisible} onClose={closePaywall} onPurchased={handlePurchased} />
    </PremiumContext.Provider>
  );
}

export function usePremium(): PremiumContextValue {
  const ctx = useContext(PremiumContext);
  if (!ctx) throw new Error('usePremium must be used within a PremiumProvider');
  return ctx;
}
