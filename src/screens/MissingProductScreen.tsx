import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';
import { BottomBannerAd } from '../components/BottomBannerAd';
import { PillButton } from '../components/PillButton';
import { colors } from '../theme/colors';
import { fonts } from '../theme/fonts';
import type { Product } from '../types/product';

interface Props {
  barcode: string;
  /** Present when OFF had a partial record (incomplete), absent for a
   * true not-found — lets us show whatever name/brand we do have. */
  product?: Product;
  onCapturePhoto: () => void;
  onScanAgain: () => void;
}

export function MissingProductScreen({ barcode, product, onCapturePhoto, onScanAgain }: Props) {
  const { t } = useTranslation();
  const bob = useRef(new Animated.Value(0)).current;
  const glow = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const bobLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(bob, { toValue: 1, duration: 1000, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(bob, { toValue: 0, duration: 1000, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ])
    );
    const glowLoop = Animated.loop(
      Animated.timing(glow, { toValue: 1, duration: 2200, easing: Easing.out(Easing.ease), useNativeDriver: true })
    );
    bobLoop.start();
    glowLoop.start();
    return () => {
      bobLoop.stop();
      glowLoop.stop();
    };
  }, [bob, glow]);

  const translateY = bob.interpolate({ inputRange: [0, 1], outputRange: [0, -9] });
  const rotate = bob.interpolate({ inputRange: [0, 1], outputRange: ['-4deg', '4deg'] });
  const glowScale = glow.interpolate({ inputRange: [0, 1], outputRange: [1, 1.6] });
  const glowOpacity = glow.interpolate({ inputRange: [0, 0.3, 1], outputRange: [0.55, 0.3, 0] });

  return (
    <View style={styles.screen}>
      <View style={styles.container}>
        <Animated.View style={[styles.mascot, { transform: [{ translateY }, { rotate }] }]}>
          <Text style={styles.mascotText}>?</Text>
        </Animated.View>

        {product?.productName ? (
          <Text style={styles.headline}>{t('missing.knownName', { name: product.productName })}</Text>
        ) : (
          <Text style={styles.headline}>{t('missing.unknownHeadline')}</Text>
        )}
        <Text style={styles.body}>{t('missing.body')}</Text>

        <View style={styles.ctaWrap}>
          <Animated.View
            style={[
              styles.glowRing,
              { transform: [{ scale: glowScale }], opacity: glowOpacity },
            ]}
          />
          <PillButton title={t('missing.snapLabel')} onPress={onCapturePhoto} variant="citrus" />
        </View>

        <PillButton title={t('missing.scanAnother')} onPress={onScanAgain} variant="ghost" />

        <Text style={styles.stat}>{t('missing.barcodeLabel', { barcode })}</Text>
      </View>
      <BottomBannerAd />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.cabinet,
  },
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 28,
    gap: 14,
  },
  mascot: {
    width: 66,
    height: 66,
    borderRadius: 33,
    borderWidth: 3,
    borderStyle: 'dashed',
    borderColor: colors.citrus,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  mascotText: {
    fontFamily: fonts.displayBold,
    fontSize: 26,
    color: colors.citrus,
  },
  headline: {
    fontFamily: fonts.displayBold,
    fontSize: 19,
    color: colors.cream,
    textAlign: 'center',
  },
  body: {
    fontSize: 13.5,
    lineHeight: 20,
    textAlign: 'center',
    color: colors.cream,
    opacity: 0.7,
    maxWidth: 280,
  },
  ctaWrap: {
    marginTop: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  glowRing: {
    position: 'absolute',
    width: 160,
    height: 52,
    borderRadius: 999,
    backgroundColor: colors.citrus,
  },
  stat: {
    marginTop: 6,
    fontFamily: fonts.mono,
    fontSize: 10.5,
    color: colors.cream,
    opacity: 0.4,
  },
});
