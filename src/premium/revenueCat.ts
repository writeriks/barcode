import { Platform } from 'react-native';
import type { CustomerInfo, PurchasesOffering, PurchasesPackage } from 'react-native-purchases';
import { REVENUECAT_API_KEY_IOS } from '../config/revenueCatEnv';
import { isExpoGo } from '../services/ads/environment';

/** Must match the entitlement identifier configured in the RevenueCat
 * dashboard that the weekly/monthly products both grant — RevenueCat →
 * Product catalog → Entitlements → "blippo Pro" (Product catalog →
 * Entitlements → Identifier field; not the "REST API Identifier" shown
 * further down that page, which is a different internal ID). */
export const PREMIUM_ENTITLEMENT_ID = 'blippo Pro';

export interface PremiumEntitlement {
  isEntitled: boolean;
  /** False once the user has cancelled (or the store won't renew for
   * another reason). Access still lasts until `expirationDate`. */
  willRenew: boolean;
  /** ISO timestamp, or null for lifetime / unknown. */
  expirationDate: string | null;
  /** ISO timestamp set by RevenueCat when a cancellation is detected. */
  unsubscribeDetectedAt: string | null;
}

const EMPTY_ENTITLEMENT: PremiumEntitlement = {
  isEntitled: false,
  willRenew: false,
  expirationDate: null,
  unsubscribeDetectedAt: null,
};

/** react-native-purchases isn't part of Expo Go's bundled native modules —
 * importing it crashes at import time under Expo Go, same problem the ads
 * services have with react-native-google-mobile-ads. Android also has no
 * RevenueCat key yet (see config/revenueCatEnv.ts), so every entry point
 * below is a no-op there rather than failing. */
function isSupported(): boolean {
  return !isExpoGo() && Platform.OS === 'ios' && Boolean(REVENUECAT_API_KEY_IOS);
}

let modulePromise: Promise<typeof import('react-native-purchases')> | null = null;
function loadModule() {
  if (!modulePromise) modulePromise = import('react-native-purchases');
  return modulePromise;
}

function entitlementFromInfo(info: CustomerInfo): PremiumEntitlement {
  const active = info.entitlements.active[PREMIUM_ENTITLEMENT_ID];
  if (!active) return EMPTY_ENTITLEMENT;
  return {
    isEntitled: true,
    willRenew: active.willRenew,
    expirationDate: active.expirationDate ?? null,
    unsubscribeDetectedAt: active.unsubscribeDetectedAt ?? null,
  };
}

function hasEntitlement(info: CustomerInfo): boolean {
  return entitlementFromInfo(info).isEntitled;
}

let configured = false;

export async function configurePurchases(): Promise<void> {
  if (configured || !isSupported()) return;
  const { default: Purchases, LOG_LEVEL } = await loadModule();
  if (__DEV__) await Purchases.setLogLevel(LOG_LEVEL.DEBUG);
  Purchases.configure({ apiKey: REVENUECAT_API_KEY_IOS! });
  configured = true;
}

export async function fetchPremiumEntitlement(options?: { refresh?: boolean }): Promise<PremiumEntitlement> {
  if (!isSupported()) return EMPTY_ENTITLEMENT;
  const { default: Purchases } = await loadModule();
  if (options?.refresh) {
    try {
      await Purchases.invalidateCustomerInfoCache();
    } catch {
      // Still try getCustomerInfo — dropping the cache isn't required to read.
    }
  }
  const info = await Purchases.getCustomerInfo();
  return entitlementFromInfo(info);
}

/** Fires whenever RevenueCat's cached customer info changes (a purchase,
 * restore, renewal, refund, or expiry) — including ones made outside this
 * session, e.g. on another device. Returns an unsubscribe function. */
export async function subscribeToPremiumChanges(
  onChange: (entitlement: PremiumEntitlement) => void
): Promise<() => void> {
  if (!isSupported()) return () => {};
  const { default: Purchases } = await loadModule();
  const listener = (info: CustomerInfo) => onChange(entitlementFromInfo(info));
  Purchases.addCustomerInfoUpdateListener(listener);
  return () => Purchases.removeCustomerInfoUpdateListener(listener);
}

/** The dashboard's current Offering — its `.weekly`/`.monthly` packages
 * are the predefined package types the paywall expects to be configured
 * with. Null under Expo Go, on Android, or if nothing's configured yet. */
export async function fetchCurrentOffering(): Promise<PurchasesOffering | null> {
  if (!isSupported()) return null;
  const { default: Purchases } = await loadModule();
  const offerings = await Purchases.getOfferings();
  return offerings.current;
}

interface PurchaseResult {
  isPremium: boolean;
  cancelled: boolean;
}

export async function purchasePackage(pkg: PurchasesPackage): Promise<PurchaseResult> {
  const { default: Purchases, PURCHASES_ERROR_CODE } = await loadModule();
  try {
    const { customerInfo } = await Purchases.purchasePackage(pkg);
    return { isPremium: hasEntitlement(customerInfo), cancelled: false };
  } catch (error) {
    if ((error as { code?: string }).code === PURCHASES_ERROR_CODE.PURCHASE_CANCELLED_ERROR) {
      return { isPremium: false, cancelled: true };
    }
    throw error;
  }
}

export async function restorePurchases(): Promise<boolean> {
  if (!isSupported()) return false;
  const { default: Purchases } = await loadModule();
  const info = await Purchases.restorePurchases();
  return hasEntitlement(info);
}

/** Opens the platform's native subscription management screen (on iOS,
 * the same sheet as Settings → Apple ID → Subscriptions → Blippo) —
 * RevenueCat has no management UI of its own, the App Store owns the
 * actual billing relationship, so cancelling/changing plans always has
 * to go through Apple. No-op wherever purchases aren't supported. */
export async function showManageSubscriptions(): Promise<void> {
  if (!isSupported()) return;
  const { default: Purchases } = await loadModule();
  await Purchases.showManageSubscriptions();
}
