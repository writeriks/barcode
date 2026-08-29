/** Real AdMob ad unit IDs, once there's an account — set these in a local
 * .env (see .env.example). Undefined when not set; every call site falls
 * back to Google's public test IDs in that case.
 *
 * Ad unit IDs use a slash (`/`). A tilde (`~`) is an App ID, not a unit
 * ID — treat that as unset so we never request ads against the App ID. */
function iosAdUnitId(value: string | undefined): string | undefined {
  if (!value || value.includes('~')) return undefined;
  return value;
}

export const ADMOB_BANNER_UNIT_ID = iosAdUnitId(
  process.env.EXPO_PUBLIC_ADMOB_BANNER_IOS_UNIT_ID,
);
export const ADMOB_INTERSTITIAL_UNIT_ID = iosAdUnitId(
  process.env.EXPO_PUBLIC_ADMOB_INTERSTITIAL_IOS_UNIT_ID,
);
export const ADMOB_APP_OPEN_UNIT_ID = iosAdUnitId(
  process.env.EXPO_PUBLIC_ADMOB_APP_OPEN_IOS_UNIT_ID,
);
