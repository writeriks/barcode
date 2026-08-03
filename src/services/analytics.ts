import type { PostHogEventProperties } from '@posthog/core';
import PostHog from 'posthog-react-native';
import { Platform } from 'react-native';
import { POSTHOG_API_KEY, POSTHOG_HOST } from '../config/analyticsEnv';

/** Distinguishes this app's events from others sharing the same PostHog
 * project — set as a super property on every event and person. */
const APP_NAME = 'beep';

let client: PostHog | null | undefined;

function registerAppProperty(posthog: PostHog): void {
  posthog.register({ app: APP_NAME, platform: Platform.OS });
}

/** Lazily creates the singleton PostHog client. Returns null (and stays
 * null for the rest of the session) when no API key is configured — every
 * other function here no-ops in that case instead of crashing. */
export function getAnalyticsClient(): PostHog | null {
  if (client !== undefined) return client;

  if (!POSTHOG_API_KEY) {
    client = null;
    return client;
  }

  client = new PostHog(POSTHOG_API_KEY, POSTHOG_HOST ? { host: POSTHOG_HOST } : undefined);
  registerAppProperty(client);
  return client;
}

export function captureAnalyticsEvent(event: string, properties?: PostHogEventProperties): void {
  getAnalyticsClient()?.capture(event, properties);
}

/** `app` is set explicitly here too — `register()`'s super property only
 * attaches to events, not to the person properties an identify() call
 * sets, so the two need to be kept in sync separately. */
export function identifyAnalyticsUser(userId: string, properties?: PostHogEventProperties): void {
  getAnalyticsClient()?.identify(userId, { app: APP_NAME, ...properties });
}

/** reset() also clears registered super properties, so re-register
 * immediately after — otherwise every event post-reset would be missing
 * `app` until something else happened to call register() again. */
export function resetAnalytics(): void {
  const posthog = getAnalyticsClient();
  if (!posthog) return;
  posthog.reset();
  registerAppProperty(posthog);
}
