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
 * Read from the resolved app config rather than the environment directly,
 * because app.config.ts is where EAS_BUILD can be seen: anything built on
 * EAS gets this forced to false there, whatever the environment says. So
 * a build that leaves the developer's machine can't carry the override,
 * even if a stray .env or a dashboard secret sets the variable.
 */
export const PREMIUM_TESTING_ENABLED = Constants.expoConfig?.extra?.premiumTestingEnabled === true;

/** Whether to offer the manual premium override at all. */
export const IS_PREMIUM_OVERRIDE_AVAILABLE = __DEV__ || PREMIUM_TESTING_ENABLED;
