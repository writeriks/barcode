import { useEffect, useMemo, useState, type ComponentType } from 'react';
import { StyleSheet, View } from 'react-native';
import { ADMOB_BANNER_UNIT_ID } from '../config/adsEnv';
import { areAdsEnabled, subscribeToAdsEnabled } from '../services/ads/adsEnabled';
import { isExpoGo } from '../services/ads/environment';
import { useThemeColors } from '../theme/ThemeContext';
import type { ColorTheme } from '../theme/colors';
import type { BannerAdProps } from 'react-native-google-mobile-ads';

// Reserve roughly the height of the smallest standard adaptive banner
// (~50dp) so the layout doesn't jump once the real ad reports its size —
// the anchored adaptive size itself already adapts to the device width.
const PLACEHOLDER_HEIGHT = 50;

interface ResolvedBanner {
  Component: ComponentType<BannerAdProps>;
  unitId: string;
  size: string;
}

type LoadState = 'pending' | 'loaded' | 'failed';

/**
 * Bottom banner shown on result/miss screens only — never on the live
 * camera view. Sized with AdMob's anchored adaptive banner, which fits
 * itself to the device's width, so this works the same on phones and
 * tablets without us hand-picking dimensions.
 *
 * react-native-google-mobile-ads is dynamically imported so this stays a
 * no-op under Expo Go, which can't load its native module; it only
 * actually renders once running in a real dev build. If the ad fails to
 * load (bad/missing unit ID, no fill, no network), the reserved space
 * collapses instead of leaving a broken-looking gap.
 */
export function BottomBannerAd() {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [banner, setBanner] = useState<ResolvedBanner | null>(null);
  const [loadState, setLoadState] = useState<LoadState>('pending');
  const [adsAllowed, setAdsAllowed] = useState(areAdsEnabled());

  // Ads can turn off mid-session (premium activates while this screen is
  // already mounted) — subscribe so an already-loaded banner disappears
  // immediately instead of waiting for the next mount to re-check.
  useEffect(() => subscribeToAdsEnabled(setAdsAllowed), []);

  useEffect(() => {
    if (isExpoGo() || !adsAllowed) {
      setBanner(null);
      return;
    }
    let cancelled = false;

    import('react-native-google-mobile-ads').then(({ BannerAd, BannerAdSize, TestIds }) => {
      if (cancelled) return;
      setBanner({
        Component: BannerAd,
        unitId: ADMOB_BANNER_UNIT_ID || TestIds.ADAPTIVE_BANNER,
        size: BannerAdSize.ANCHORED_ADAPTIVE_BANNER,
      });
    });

    return () => {
      cancelled = true;
    };
  }, [adsAllowed]);

  if (!banner || loadState === 'failed') {
    return null;
  }

  const { Component, unitId, size } = banner;
  return (
    <View style={[styles.wrap, loadState === 'pending' && styles.wrapPending]}>
      <Component
        unitId={unitId}
        size={size}
        onAdLoaded={() => setLoadState('loaded')}
        onAdFailedToLoad={() => setLoadState('failed')}
      />
    </View>
  );
}

function createStyles(colors: ColorTheme) {
  return StyleSheet.create({
    wrap: {
      width: '100%',
      alignItems: 'center',
      paddingTop: 6,
      borderTopWidth: 1,
      borderTopColor: colors.panelLine,
      backgroundColor: colors.cabinet,
    },
    wrapPending: {
      minHeight: PLACEHOLDER_HEIGHT,
    },
  });
}
