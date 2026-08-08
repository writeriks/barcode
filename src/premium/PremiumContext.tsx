import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { PaywallScreen } from '../screens/PaywallScreen';
import { setAdsEnabled } from '../services/ads/adsEnabled';
import { getPremiumDevOverride, setPremiumDevOverride } from './premiumPreference';

interface PremiumContextValue {
  isPremium: boolean;
  isReady: boolean;
  setPremium: (enabled: boolean) => void;
  openPaywall: () => void;
}

const PremiumContext = createContext<PremiumContextValue | null>(null);

/** Whether the current user has premium access, plus a way to trigger the
 * paywall from anywhere — the modal itself lives here too, mounted once,
 * so no screen needs to own its own paywall state. Backed by a local dev
 * override for now (see premiumPreference.ts); swapping in real
 * RevenueCat entitlements later only touches that file and the effect
 * below, not any of the call sites using usePremium(). */
export function PremiumProvider({ children }: { children: ReactNode }) {
  const [isPremium, setIsPremiumState] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [isPaywallVisible, setIsPaywallVisible] = useState(false);

  useEffect(() => {
    getPremiumDevOverride().then((enabled) => {
      setIsPremiumState(enabled);
      setIsReady(true);
    });
  }, []);

  // Ads check this flag directly (see services/ads/adsEnabled.ts) rather
  // than depending on this context, so keep it in sync here.
  useEffect(() => {
    if (isReady) setAdsEnabled(!isPremium);
  }, [isPremium, isReady]);

  const setPremium = useCallback((enabled: boolean) => {
    setIsPremiumState(enabled);
    setPremiumDevOverride(enabled);
  }, []);

  const openPaywall = useCallback(() => setIsPaywallVisible(true), []);

  const handleUnlock = useCallback(() => {
    setPremium(true);
    setIsPaywallVisible(false);
  }, [setPremium]);

  const value = useMemo(
    () => ({ isPremium, isReady, setPremium, openPaywall }),
    [isPremium, isReady, setPremium, openPaywall]
  );

  return (
    <PremiumContext.Provider value={value}>
      {children}
      <PaywallScreen visible={isPaywallVisible} onClose={() => setIsPaywallVisible(false)} onUnlock={handleUnlock} />
    </PremiumContext.Provider>
  );
}

export function usePremium(): PremiumContextValue {
  const ctx = useContext(PremiumContext);
  if (!ctx) throw new Error('usePremium must be used within a PremiumProvider');
  return ctx;
}
