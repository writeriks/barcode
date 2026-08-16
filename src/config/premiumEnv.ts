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
 * Two independent things have to agree, and each covers the other:
 *
 *  - The environment variable, which Metro inlines straight into the
 *    bundle. This is the one that actually turns the rows on, and it works
 *    the same in Debug, Release, bare — it doesn't depend on a manifest
 *    being readable at runtime.
 *  - A veto from the resolved app config, which app.config.ts sets to
 *    false whenever EAS_BUILD is present.
 *
 * An EAS build is blocked by eas.json pinning the variable to "false" on
 * the preview and production profiles, *and* by the veto. If the manifest
 * isn't readable the veto simply doesn't apply — it can only ever turn
 * this off, never on, so a missing config can't hand out the override.
 */
const envEnabled = process.env.EXPO_PUBLIC_PREMIUM_TESTING === 'true';
const configVetoes = Constants.expoConfig?.extra?.premiumTestingEnabled === false;

export const PREMIUM_TESTING_ENABLED = envEnabled && !configVetoes;

/** Whether to offer the manual premium override at all. */
export const IS_PREMIUM_OVERRIDE_AVAILABLE = __DEV__ || PREMIUM_TESTING_ENABLED;
