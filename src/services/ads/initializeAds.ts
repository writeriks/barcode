import { gatherConsent } from './consent';
import { isExpoGo } from './environment';
import { requestTrackingTransparency } from './trackingTransparency';

/**
 * Call once on app start. No-op under Expo Go. Gathers UMP consent first
 * (a no-op everywhere the AdMob console has no message configured, or
 * outside a regulated region) and only initializes the SDK once
 * `canRequestAds` is true, requesting iOS's ATT permission in between per
 * Apple/Google's recommended order.
 */
export async function initializeAds(): Promise<void> {
  if (isExpoGo()) return;

  const canRequestAds = await gatherConsent();
  if (!canRequestAds) return;

  await requestTrackingTransparency();

  const { default: mobileAds } = await import('react-native-google-mobile-ads');
  await mobileAds().initialize();
}
