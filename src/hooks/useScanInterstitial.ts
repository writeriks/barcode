import { useCallback, useEffect, useRef } from 'react';
import { areAdsEnabled } from '../services/ads/adsEnabled';
import { isExpoGo } from '../services/ads/environment';
import { shouldShowInterstitialForScan } from '../services/ads/interstitialSchedule';
import type { InterstitialAd as InterstitialAdType } from 'react-native-google-mobile-ads';

/**
 * Preloads an interstitial video ad and exposes `maybeShowForScan`, meant
 * to be called once per completed scan — it shows (and queues the next
 * preload) only on every Nth scan per interstitialSchedule, otherwise it's
 * a no-op. Built on the library's plain InterstitialAd class rather than
 * its React hook, since the hook requires a static import — this stays
 * dynamically imported so it never touches the native module under Expo Go.
 */
export function useScanInterstitial() {
  const adRef = useRef<InterstitialAdType | null>(null);
  const isLoadedRef = useRef(false);
  const mountedRef = useRef(true);

  const loadNextAd = useCallback(async () => {
    if (isExpoGo() || !areAdsEnabled()) return;

    const { InterstitialAd, AdEventType, TestIds } = await import('react-native-google-mobile-ads');
    if (!mountedRef.current) return;

    // TODO: swap for a real production ad unit ID once there's an AdMob account.
    const ad = InterstitialAd.createForAdRequest(TestIds.INTERSTITIAL_VIDEO ?? TestIds.INTERSTITIAL);
    isLoadedRef.current = false;

    const unsubscribeLoaded = ad.addAdEventListener(AdEventType.LOADED, () => {
      isLoadedRef.current = true;
    });
    const unsubscribeClosed = ad.addAdEventListener(AdEventType.CLOSED, () => {
      isLoadedRef.current = false;
      unsubscribeLoaded();
      unsubscribeClosed();
      loadNextAd();
    });

    adRef.current = ad;
    ad.load();
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    loadNextAd();
    return () => {
      mountedRef.current = false;
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
