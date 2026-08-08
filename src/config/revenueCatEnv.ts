/** RevenueCat is only set up for iOS so far — no Android key has been
 * provisioned (see .env.example). Two separate RevenueCat projects/keys
 * exist so sandbox testing never mixes with real production revenue:
 * the TEST key is used for local/dev-client builds (StoreKit sandbox),
 * the PROD key for TestFlight/App Store release builds. */
export const REVENUECAT_API_KEY_IOS = __DEV__
  ? process.env.EXPO_PUBLIC_REVENUECAT_API_KEY_IOS_TEST
  : process.env.EXPO_PUBLIC_REVENUECAT_API_KEY_IOS_PROD;
