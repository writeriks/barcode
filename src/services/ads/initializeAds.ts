import { isExpoGo } from './environment';

/** Call once on app start. No-op under Expo Go — see environment.ts. */
export async function initializeAds(): Promise<void> {
  if (isExpoGo()) return;
  const { default: mobileAds } = await import('react-native-google-mobile-ads');
  await mobileAds().initialize();
}
