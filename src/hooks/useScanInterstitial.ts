import { useCallback, useEffect, useRef } from 'react';
import { ADMOB_INTERSTITIAL_UNIT_ID } from '../config/adsEnv';
import { areAdsEnabled } from '../services/ads/adsEnabled';
import { isExpoGo } from '../services/ads/environment';
import {
  canShowInterstitial,
  loadInterstitialSchedule,
  recordInterstitialShown,
  recordScan,
} from '../services/ads/interstitialSchedule';
import type { InterstitialAd as InterstitialAdType } from 'react-native-google-mobile-ads';

const RETRY_DELAY_MS = 30_000;

/**
 * Preloads an interstitial video ad and exposes two calls: `countScan`,
 * for the moment a scan completes, and `maybeShowOnLeavingResult`, for the
 * moment the user is done with the answer and heading back to the camera.
 *
 * They are separate because the ad belongs at the second moment, not the
 * first. Covering a result the instant it appears is what made this feel
 * like the app was working for the advertiser; showing it as the user
 * leaves costs them nothing they were still looking at. How often is
 * interstitialSchedule's business. Built on the library's plain
 * InterstitialAd class rather than
 * its React hook, since the hook requires a static import — this stays
 * dynamically imported so it never touches the native module under Expo Go.
 *
 * Fails gracefully: if a load errors (bad/missing unit ID, no fill, no
 * network), maybeShowOnLeavingResult just stays a no-op — the scan flow is
 * never blocked on an ad — and a retry is scheduled after a short delay.
 */
export function useScanInterstitial() {
  const adRef = useRef<InterstitialAdType | null>(null);
  const isLoadedRef = useRef(false);
  const mountedRef = useRef(true);
  const retryTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const loadNextAd = useCallback(async () => {
    if (isExpoGo() || !areAdsEnabled()) return;

    const { InterstitialAd, AdEventType, TestIds } = await import('react-native-google-mobile-ads');
    if (!mountedRef.current) return;

    const unitId = ADMOB_INTERSTITIAL_UNIT_ID || TestIds.INTERSTITIAL_VIDEO || TestIds.INTERSTITIAL;
    const ad = InterstitialAd.createForAdRequest(unitId);
    isLoadedRef.current = false;

    const unsubscribeLoaded = ad.addAdEventListener(AdEventType.LOADED, () => {
      isLoadedRef.current = true;
    });
    const unsubscribeClosed = ad.addAdEventListener(AdEventType.CLOSED, () => {
      isLoadedRef.current = false;
      unsubscribeLoaded();
      unsubscribeClosed();
      unsubscribeError();
      loadNextAd();
    });
    const unsubscribeError = ad.addAdEventListener(AdEventType.ERROR, () => {
      isLoadedRef.current = false;
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

  useEffect(() => {
    mountedRef.current = true;
    void loadInterstitialSchedule();
    loadNextAd();
    return () => {
      mountedRef.current = false;
      if (retryTimeoutRef.current) clearTimeout(retryTimeoutRef.current);
    };
  }, [loadNextAd]);

  const maybeShowOnLeavingResult = useCallback(() => {
    if (isExpoGo() || !areAdsEnabled()) return;
    if (!canShowInterstitial()) return;
    // Nothing loaded is not a missed turn: the schedule is only spent once
    // an ad is genuinely on screen, so the next result gets to ask again.
    if (!adRef.current || !isLoadedRef.current) return;
    adRef.current.show();
    recordInterstitialShown();
  }, []);

  return { countScan: recordScan, maybeShowOnLeavingResult };
}
