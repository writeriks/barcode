import Constants from 'expo-constants';

/**
 * Reveals the Settings rows that switch premium on without buying it and
 * hand back the free document-scan allowance, so every gated feature can
 * be exercised on a device.
 *
 * `__DEV__` alone isn't enough: a Release build made locally
 * (`expo run:ios --configuration Release`) is the closest thing to what
 * ships, and it's exactly where premium behaviour most wants checking —
 * but `__DEV__` is false there, so the rows would be invisible.
 *
 * On by default, off for EAS builds. A local Release build has no
 * RevenueCat key configured, so this override is the only way to reach a
 * premium feature there — requiring an opt-in .env to see it would defeat
 * the point of having it. Everything that reaches a user is built by EAS,
 * and those builds identify themselves.
 *
 * Two independent things have to agree, and each covers the other:
 *
 *  - The environment variable, which Metro inlines straight into the
 *    bundle. eas.json pins it to "false" on every profile. This works the
 *    same in Debug, Release and bare — no manifest needed at runtime.
 *  - A veto from the resolved app config, which app.config.ts sets to
 *    false whenever EAS_BUILD is present. This is the backstop for a
 *    profile someone adds later and forgets to pin.
 *
 * The veto can only ever turn this off, never on, so an unreadable
 * manifest costs nothing.
 */
const envEnabled = process.env.EXPO_PUBLIC_PREMIUM_TESTING !== 'false';
const configVetoes = Constants.expoConfig?.extra?.premiumTestingEnabled === false;

export const PREMIUM_TESTING_ENABLED = envEnabled && !configVetoes;

/** Whether to offer the manual premium override at all. */
export const IS_PREMIUM_OVERRIDE_AVAILABLE = __DEV__ || PREMIUM_TESTING_ENABLED;
