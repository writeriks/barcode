import { useCallback, useEffect, useRef } from 'react';
import { AppState } from 'react-native';
import { ADMOB_APP_OPEN_UNIT_ID } from '../config/adsEnv';
import { areAdsEnabled, subscribeToAdsEnabled } from '../services/ads/adsEnabled';
import {
  canShowAppOpenNow,
  canShowAppOpenOnResume,
  consumeFirstAppOpenLaunch,
  recordAppOpenShown,
} from '../services/ads/appOpenSchedule';
import { isExpoGo } from '../services/ads/environment';
import { initializeAds } from '../services/ads/initializeAds';
import { beginSystemUiSession, endSystemUiSession, isSystemUiSessionActive } from '../services/systemUiSession';
import type { AppOpenAd as AppOpenAdType } from 'react-native-google-mobile-ads';

/** Give up showing rather than leave the user staring at a spinner. A
 *  load that finishes later is kept for the next eligible opening. */
const SHOW_WAIT_MS = 4500;

/** Google's App Open creatives expire about four hours after load. */
const AD_TTL_MS = 4 * 60 * 60 * 1000;

const RETRY_DELAY_MS = 30_000;

interface Props {
  /** The user is past onboarding and the lock screen. Ads never present
   *  over either, and a resume that lands on the lock is skipped. */
  appIsInteractive: boolean;
  /** Consent and ATT must not run over the welcome screen. The SDK starts
   *  once onboarding is done, even if the lock screen is still up, so a
   *  creative can be waiting by the time they unlock. */
  adsSdkMayStart: boolean;
}

/**
 * Preloads an App Open ad and shows it on a real opening: a cold start
 * after the first install's first opening, or a resume four hours after
 * the last App Open. How often it may stack with an interstitial is
 * fullScreenAdCooldown's business.
 *
 * Built on the library's AppOpenAd class rather than its React hook, for
 * the same reason the interstitial is: the hook requires a static import,
 * which crashes Expo Go.
 */
export function useAppOpenAd({ appIsInteractive, adsSdkMayStart }: Props): void {
  const adRef = useRef<AppOpenAdType | null>(null);
  const loadedAtRef = useRef(0);
  const showingRef = useRef(false);
  const mountedRef = useRef(true);
  const retryTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const coldStartAttemptedRef = useRef(false);
  const loadGenerationRef = useRef(0);
  const appStateRef = useRef(AppState.currentState);

  const isFresh = useCallback(() => {
    return loadedAtRef.current > 0 && Date.now() - loadedAtRef.current < AD_TTL_MS;
  }, []);

  const loadNextAd = useCallback(async () => {
    if (isExpoGo() || !areAdsEnabled()) return;
    const sdkReady = await initializeAds();
    if (!sdkReady || !mountedRef.current || !areAdsEnabled()) return;

    const { AppOpenAd, AdEventType, TestIds } = await import('react-native-google-mobile-ads');
    if (!mountedRef.current) return;

    const generation = ++loadGenerationRef.current;
    const unitId = ADMOB_APP_OPEN_UNIT_ID || TestIds.APP_OPEN;
    const ad = AppOpenAd.createForAdRequest(unitId);
    loadedAtRef.current = 0;

    const unsubscribeLoaded = ad.addAdEventListener(AdEventType.LOADED, () => {
      if (generation !== loadGenerationRef.current) return;
      loadedAtRef.current = Date.now();
    });
    const unsubscribeClosed = ad.addAdEventListener(AdEventType.CLOSED, () => {
      loadedAtRef.current = 0;
      showingRef.current = false;
      endSystemUiSession();
      unsubscribeLoaded();
      unsubscribeClosed();
      unsubscribeError();
      loadNextAd();
    });
    const unsubscribeError = ad.addAdEventListener(AdEventType.ERROR, () => {
      if (generation !== loadGenerationRef.current) return;
      loadedAtRef.current = 0;
      if (showingRef.current) {
        showingRef.current = false;
        endSystemUiSession();
      }
      unsubscribeLoaded();
      unsubscribeClosed();
      unsubscribeError();
      if (mountedRef.current) {
        retryTimeoutRef.current = setTimeout(loadNextAd, RETRY_DELAY_MS);
      }
    });

    adRef.current = ad;
    ad.load();
  }, []);

  const waitUntilLoaded = useCallback(
    (timeoutMs: number) =>
      new Promise<boolean>((resolve) => {
        if (isFresh()) {
          resolve(true);
          return;
        }
        const started = Date.now();
        const tick = () => {
          if (!mountedRef.current) {
            resolve(false);
            return;
          }
          if (isFresh()) {
            resolve(true);
            return;
          }
          if (Date.now() - started >= timeoutMs) {
            resolve(false);
            return;
          }
          setTimeout(tick, 100);
        };
        tick();
      }),
    [isFresh]
  );

  const maybeShow = useCallback(
    async (reason: 'cold' | 'resume') => {
      if (!appIsInteractive || isExpoGo() || !areAdsEnabled()) return;
      if (showingRef.current || isSystemUiSessionActive()) return;
      if (!canShowAppOpenNow()) return;
      if (reason === 'resume' && !canShowAppOpenOnResume()) return;
      if (reason === 'cold' && (await consumeFirstAppOpenLaunch())) return;

      // Recheck after the first-launch storage read — premium or a lock
      // overlay can land in that gap.
      if (!mountedRef.current || !appIsInteractive || !areAdsEnabled()) return;
      if (!canShowAppOpenNow()) return;

      if (!isFresh()) {
        loadedAtRef.current = 0;
        void loadNextAd();
      }

      const ready = await waitUntilLoaded(SHOW_WAIT_MS);
      if (!ready || !mountedRef.current || !appIsInteractive) return;
      if (!areAdsEnabled() || isSystemUiSessionActive() || !canShowAppOpenNow()) return;
      if (reason === 'resume' && !canShowAppOpenOnResume()) return;
      if (!adRef.current || !isFresh()) return;

      showingRef.current = true;
      beginSystemUiSession();
      try {
        await adRef.current.show();
        recordAppOpenShown();
      } catch {
        showingRef.current = false;
        endSystemUiSession();
      }
    },
    [appIsInteractive, isFresh, loadNextAd, waitUntilLoaded]
  );

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (retryTimeoutRef.current) clearTimeout(retryTimeoutRef.current);
    };
  }, []);

  useEffect(() => {
    if (!adsSdkMayStart) return;
    void loadNextAd();
    const unsubscribeAds = subscribeToAdsEnabled((enabled) => {
      if (!enabled) {
        adRef.current = null;
        loadedAtRef.current = 0;
        return;
      }
      void loadNextAd();
    });
    return () => {
      unsubscribeAds();
      if (retryTimeoutRef.current) clearTimeout(retryTimeoutRef.current);
    };
  }, [adsSdkMayStart, loadNextAd]);

  useEffect(() => {
    if (!appIsInteractive || coldStartAttemptedRef.current) return;
    coldStartAttemptedRef.current = true;
    void maybeShow('cold');
  }, [appIsInteractive, maybeShow]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextState) => {
      const previous = appStateRef.current;
      appStateRef.current = nextState;
      if (previous !== 'background' || nextState !== 'active') return;
      if (!appIsInteractive || showingRef.current || isSystemUiSessionActive()) return;
      void maybeShow('resume');
    });
    return () => subscription.remove();
  }, [appIsInteractive, maybeShow]);
}
