import Constants, { ExecutionEnvironment } from 'expo-constants';

/**
 * AdMob's native module isn't part of Expo Go's bundled module set — merely
 * importing react-native-google-mobile-ads crashes the app under Expo Go
 * (it enforces the native module exists at import time). Every ad entry
 * point must check this before importing the library, so the rest of the
 * app keeps working in Expo Go until a real dev build exists.
 */
export function isExpoGo(): boolean {
  return Constants.executionEnvironment === ExecutionEnvironment.StoreClient;
}
