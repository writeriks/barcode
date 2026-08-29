/** Real AdMob ad unit IDs, once there's an account — set these in a local
 * .env (see .env.example). Undefined when not set; every call site falls
 * back to Google's public test IDs in that case. */
export const ADMOB_BANNER_UNIT_ID = process.env.EXPO_PUBLIC_ADMOB_BANNER_UNIT_ID;
export const ADMOB_INTERSTITIAL_UNIT_ID = process.env.EXPO_PUBLIC_ADMOB_INTERSTITIAL_UNIT_ID;
export const ADMOB_APP_OPEN_UNIT_ID = process.env.EXPO_PUBLIC_ADMOB_APP_OPEN_UNIT_ID;
