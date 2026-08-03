import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import { useEffect, useMemo, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Animated, Easing, Linking, StyleSheet, Text, View } from 'react-native';
import { BottomBannerAd } from '../components/BottomBannerAd';
import { PillButton } from '../components/PillButton';
import { useThemeColors } from '../theme/ThemeContext';
import type { ColorTheme } from '../theme/colors';
import { fonts } from '../theme/fonts';
import { amazonSearchUrl, googleSearchUrl } from '../utils/productSearchLinks';

interface Props {
  barcode: string;
  onScanAgain: () => void;
}

/** Shown only when Open Food Facts has no record at all for this barcode —
 * any partial data (a name, a brand, a low completeness score) is a
 * "result" now and goes to FoundProductScreen instead. */
export function MissingProductScreen({ barcode, onScanAgain }: Props) {
  const { t } = useTranslation();
  const tabBarHeight = useBottomTabBarHeight();
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const bob = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const bobLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(bob, { toValue: 1, duration: 1000, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(bob, { toValue: 0, duration: 1000, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ])
    );
    bobLoop.start();
    return () => bobLoop.stop();
  }, [bob]);

  const translateY = bob.interpolate({ inputRange: [0, 1], outputRange: [0, -9] });
  const rotate = bob.interpolate({ inputRange: [0, 1], outputRange: ['-4deg', '4deg'] });

  const openIfSupported = async (url: string) => {
    const supported = await Linking.canOpenURL(url);
    if (supported) Linking.openURL(url);
  };

  return (
    <View style={[styles.screen, { paddingBottom: tabBarHeight }]}>
      <View style={styles.container}>
        <Animated.View style={[styles.mascot, { transform: [{ translateY }, { rotate }] }]}>
          <Text style={styles.mascotText}>?</Text>
        </Animated.View>

        <Text style={styles.headline}>{t('missing.unknownHeadline')}</Text>
        <Text style={styles.body}>{t('missing.body')}</Text>

        <View style={styles.searchRow}>
          <PillButton
            title={t('missing.searchGoogle')}
            icon="logo-google"
            onPress={() => openIfSupported(googleSearchUrl(barcode))}
            variant="ghost"
            style={styles.flexButton}
          />
          <PillButton
            title={t('missing.searchAmazon')}
            icon="logo-amazon"
            onPress={() => openIfSupported(amazonSearchUrl(barcode))}
            variant="ghost"
            style={styles.flexButton}
          />
        </View>

        <PillButton title={t('missing.scanAnother')} onPress={onScanAgain} variant="ghost" />

        <Text style={styles.stat}>{t('missing.barcodeLabel', { barcode })}</Text>
      </View>
      <BottomBannerAd />
    </View>
  );
}

function createStyles(colors: ColorTheme) {
  return StyleSheet.create({
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
      borderColor: colors.citrusText,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 6,
    },
    mascotText: {
      fontFamily: fonts.displayBold,
      fontSize: 26,
      color: colors.citrusText,
    },
    headline: {
      fontFamily: fonts.displayBold,
      fontSize: 19,
      color: colors.text,
      textAlign: 'center',
    },
    body: {
      fontSize: 13.5,
      lineHeight: 20,
      textAlign: 'center',
      color: colors.text,
      opacity: 0.7,
      maxWidth: 280,
    },
    searchRow: {
      flexDirection: 'row',
      gap: 10,
      width: '100%',
      marginTop: 6,
    },
    flexButton: {
      flex: 1,
    },
    stat: {
      marginTop: 6,
      fontFamily: fonts.mono,
      fontSize: 10.5,
      color: colors.text,
      opacity: 0.4,
    },
  });
}
