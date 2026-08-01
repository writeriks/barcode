import { useCallback, useEffect, useRef } from 'react';
import { ADMOB_INTERSTITIAL_UNIT_ID } from '../config/adsEnv';
import { areAdsEnabled } from '../services/ads/adsEnabled';
import { isExpoGo } from '../services/ads/environment';
import { shouldShowInterstitialForScan } from '../services/ads/interstitialSchedule';
import type { InterstitialAd as InterstitialAdType } from 'react-native-google-mobile-ads';

const RETRY_DELAY_MS = 30_000;

/**
 * Preloads an interstitial video ad and exposes `maybeShowForScan`, meant
 * to be called once per completed scan — it shows (and queues the next
 * preload) only on every Nth scan per interstitialSchedule, otherwise it's
 * a no-op. Built on the library's plain InterstitialAd class rather than
 * its React hook, since the hook requires a static import — this stays
 * dynamically imported so it never touches the native module under Expo Go.
 *
 * Fails gracefully: if a load errors (bad/missing unit ID, no fill, no
 * network), maybeShowForScan just stays a no-op — the scan flow is never
 * blocked on an ad — and a retry is scheduled after a short delay.
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
    loadNextAd();
    return () => {
      mountedRef.current = false;
      if (retryTimeoutRef.current) clearTimeout(retryTimeoutRef.current);
    };
  }, [loadNextAd]);

  const maybeShowForScan = useCallback(() => {
    if (isExpoGo() || !areAdsEnabled()) return;
    if (!shouldShowInterstitialForScan()) return;
    if (adRef.current && isLoadedRef.current) {
      adRef.current.show();
    }
  }, []);

  return { maybeShowForScan };
}
