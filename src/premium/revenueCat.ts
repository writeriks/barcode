import { Platform } from 'react-native';
import type { CustomerInfo, PurchasesOffering, PurchasesPackage } from 'react-native-purchases';
import { REVENUECAT_API_KEY_IOS } from '../config/revenueCatEnv';
import { isExpoGo } from '../services/ads/environment';

/** Must match the entitlement identifier configured in the RevenueCat
 * dashboard that the weekly/monthly products both grant. */
export const PREMIUM_ENTITLEMENT_ID = 'premium';

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

function hasEntitlement(info: CustomerInfo): boolean {
  return info.entitlements.active[PREMIUM_ENTITLEMENT_ID] != null;
}

let configured = false;

export async function configurePurchases(): Promise<void> {
  if (configured || !isSupported()) return;
  const { default: Purchases, LOG_LEVEL } = await loadModule();
  if (__DEV__) await Purchases.setLogLevel(LOG_LEVEL.DEBUG);
  Purchases.configure({ apiKey: REVENUECAT_API_KEY_IOS! });
  configured = true;
}

export async function fetchIsPremium(): Promise<boolean> {
  if (!isSupported()) return false;
  const { default: Purchases } = await loadModule();
  const info = await Purchases.getCustomerInfo();
  return hasEntitlement(info);
}

/** Fires whenever RevenueCat's cached customer info changes (a purchase,
 * restore, renewal, refund, or expiry) — including ones made outside this
 * session, e.g. on another device. Returns an unsubscribe function. */
export async function subscribeToPremiumChanges(onChange: (isPremium: boolean) => void): Promise<() => void> {
  if (!isSupported()) return () => {};
  const { default: Purchases } = await loadModule();
  const listener = (info: CustomerInfo) => onChange(hasEntitlement(info));
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
