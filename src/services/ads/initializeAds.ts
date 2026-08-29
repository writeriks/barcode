import { gatherConsent } from './consent';
import { isExpoGo } from './environment';
import { requestTrackingTransparency } from './trackingTransparency';

let initPromise: Promise<boolean> | null = null;

/**
 * Call once on app start. No-op under Expo Go. Gathers UMP consent first
 * (a no-op everywhere the AdMob console has no message configured, or
 * outside a regulated region) and only initializes the SDK once
 * `canRequestAds` is true, requesting iOS's ATT permission in between per
 * Apple/Google's recommended order.
 *
 * Returns whether the SDK is actually up — App Open needs to know, and a
 * second caller (the hook that shows it) shares this promise so consent
 * and ATT never run twice.
 */
export function initializeAds(): Promise<boolean> {
  if (!initPromise) initPromise = doInitializeAds();
  return initPromise;
}

async function doInitializeAds(): Promise<boolean> {
  if (isExpoGo()) return false;

  const canRequestAds = await gatherConsent();
  if (!canRequestAds) return false;

  await requestTrackingTransparency();

  const { default: mobileAds } = await import('react-native-google-mobile-ads');
  await mobileAds().initialize();
  return true;
}
