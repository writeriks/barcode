import { useEffect, useState, type ComponentType } from 'react';
import { StyleSheet, View } from 'react-native';
import { areAdsEnabled } from '../services/ads/adsEnabled';
import { isExpoGo } from '../services/ads/environment';
import { colors } from '../theme/colors';
import type { BannerAdProps } from 'react-native-google-mobile-ads';

interface ResolvedBanner {
  Component: ComponentType<BannerAdProps>;
  unitId: string;
  size: string;
}

/**
 * Bottom banner shown on result/miss screens only — never on the live
 * camera view. react-native-google-mobile-ads is dynamically imported so
 * this stays a no-op under Expo Go, which can't load its native module;
 * it only actually renders once running in a real dev build.
 */
export function BottomBannerAd() {
  const [banner, setBanner] = useState<ResolvedBanner | null>(null);

  useEffect(() => {
    if (isExpoGo() || !areAdsEnabled()) return;
    let cancelled = false;

    import('react-native-google-mobile-ads').then(({ BannerAd, BannerAdSize, TestIds }) => {
      if (cancelled) return;
      setBanner({
        Component: BannerAd,
        // TODO: swap for a real production ad unit ID once there's an AdMob account.
        unitId: TestIds.ADAPTIVE_BANNER,
        size: BannerAdSize.ANCHORED_ADAPTIVE_BANNER,
      });
    });

    return () => {
      cancelled = true;
    };
  }, []);

  if (!banner) return null;

  const { Component, unitId, size } = banner;
  return (
    <View style={styles.wrap}>
      <Component unitId={unitId} size={size} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: colors.panelLine,
    backgroundColor: colors.cabinet,
  },
});
