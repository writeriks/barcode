import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { AppState } from 'react-native';
import { IS_PREMIUM_OVERRIDE_AVAILABLE } from '../config/premiumEnv';
import { PaywallScreen } from '../screens/PaywallScreen';
import { setAdsEnabled } from '../services/ads/adsEnabled';
import { resetPremiumSettings } from '../services/premiumSetting';
import { getPremiumDevOverride, setPremiumDevOverride } from './premiumPreference';
import { setPremiumActive } from './premiumState';
import { finishSubscriptionManagement, isSubscriptionManagementOpen } from './subscriptionManagement';
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

  // Whether the store has actually answered at least once. A failed fetch
  // leaves the app looking not-premium, which is the right way to behave
  // but the wrong thing to act destructively on.
  const entitlementKnownRef = useRef(false);

  const refreshGate = useRef({ inFlight: false, pending: false });
  const refreshPremium = useCallback(async () => {
    const gate = refreshGate.current;
    if (gate.inFlight) {
      gate.pending = true;
      return;
    }
    gate.inFlight = true;
    gate.pending = false;
    try {
      const next = await fetchPremiumEntitlement({ refresh: true });
      entitlementKnownRef.current = true;
      applyEntitlement(next);
    } catch {
      // Keep the last known entitlement if Apple/RevenueCat is unreachable.
    } finally {
      gate.inFlight = false;
      if (gate.pending) void refreshPremium();
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
        entitlementKnownRef.current = true;
        applyEntitlement(next);
        setDevOverrideState(override);
      } catch {
        // Leave the empty default — isReady still has to flip so callers
        // aren't stuck treating unresolved as premium forever. But it is
        // a guess, not an answer: entitlementKnownRef stays false so the
        // settings reset below doesn't fire on a phone with no signal.
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
  // sheet. The in-app sheet usually only goes inactive, not background,
  // and its native promise sometimes never resolves; both paths need a
  // refresh or Settings keeps saying "Premium active".
  const appStateRef = useRef(AppState.currentState);
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextState) => {
      const previous = appStateRef.current;
      appStateRef.current = nextState;
      if (nextState !== 'active' || previous === 'active') return;

      const managing = isSubscriptionManagementOpen();
      if (previous !== 'background' && !managing) return;

      void (async () => {
        if (managing) await finishSubscriptionManagement();
        await refreshPremium();
      })();
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

  // Synced during render, not in an effect. Effects run child-first, so a
  // child that re-reads a premium-gated value in its own effect — Settings
  // re-reading its switches, App re-reading App Lock — would run *before*
  // the effect that told premiumState the answer changed, and read the
  // previous one. A parent renders before any child effect, so this is the
  // only ordering that holds. Setting a module variable is safe to repeat;
  // React may render this twice and the second write is the same as the
  // first.
  if (isReady) setPremiumActive(isPremium);

  // Ads keep their own flag too, but flipping it notifies live listeners
  // (an already-mounted banner), and calling another component's setState
  // during this one's render is exactly what React forbids — so this one
  // stays in an effect.
  useEffect(() => {
    if (!isReady) return;
    setAdsEnabled(!isPremium);
  }, [isPremium, isReady]);

  // A subscription that ends takes its settings with it: the six switches
  // go back to the free shape, in storage and not just in what the app
  // reads, so they cannot come back on their own the next time premium
  // does. Only on an answer the store actually gave — a fetch that failed
  // looks identical to a lapse from here, and the cost of getting that
  // wrong is a paying user's setup.
  useEffect(() => {
    if (!isReady || isPremium || !entitlementKnownRef.current) return;
    void resetPremiumSettings();
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
