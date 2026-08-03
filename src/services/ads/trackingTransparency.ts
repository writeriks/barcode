import { Platform } from 'react-native';
import { isExpoGo } from './environment';

/**
 * The ATT system prompt is iOS-only and, like every other native ads
 * module here, isn't part of Expo Go's bundled module set — call after
 * consent is gathered and before any ad request, per Apple/Google's
 * recommended order.
 */
export async function requestTrackingTransparency(): Promise<void> {
  if (Platform.OS !== 'ios' || isExpoGo()) return;
  const { requestTrackingPermissionsAsync } = await import('expo-tracking-transparency');
  await requestTrackingPermissionsAsync();
}
