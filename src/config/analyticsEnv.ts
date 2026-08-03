/** Real PostHog project credentials, once there's a project — set these in
 * a local .env (see .env.example). No test-project fallback exists for
 * PostHog (unlike AdMob's public test IDs), so analytics simply sends
 * nowhere useful until both are set. */
export const POSTHOG_API_KEY = process.env.EXPO_PUBLIC_POSTHOG_API_KEY;
export const POSTHOG_HOST = process.env.EXPO_PUBLIC_POSTHOG_HOST;
