/**
 * Reveals the Settings toggle that switches premium on without buying it,
 * so every gated feature can be exercised on a device.
 *
 * `__DEV__` alone isn't enough: a Release build made locally
 * (`expo run:ios --configuration Release`) is the closest thing to what
 * ships, and it's exactly where premium behaviour most wants checking —
 * but `__DEV__` is false there, so the toggle would be invisible.
 *
 * This is a build-time value, inlined into the bundle when it's built. A
 * build made without the variable set — which is every EAS/App Store
 * build, since .env is local and gitignored — has no way to switch it on
 * afterwards, so the toggle can't reach real users.
 */
export const PREMIUM_TESTING_ENABLED = process.env.EXPO_PUBLIC_PREMIUM_TESTING === 'true';

/** Whether to offer the manual premium override at all. */
export const IS_PREMIUM_OVERRIDE_AVAILABLE = __DEV__ || PREMIUM_TESTING_ENABLED;
