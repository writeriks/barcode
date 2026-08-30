import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, StyleSheet, View } from 'react-native';
import { BANNER_AD_RESERVED_HEIGHT, BottomBannerAd } from '../components/BottomBannerAd';
import { CopyableBarcode } from '../components/CopyableBarcode';
import { PillButton } from '../components/PillButton';
import { Toast } from '../components/Toast';
import { useToast } from '../hooks/useToast';
import { useThemeColors } from '../theme/ThemeContext';
import type { ColorTheme } from '../theme/colors';
import type { Product, ProductSource } from '../types/product';
import { ProductResultBody } from './productResult/compose';
import { ProductResultProvider } from './productResult/ProductResultContext';

interface Props {
  product: Product;
  source: ProductSource;
  /** Live scan only. History reuses this screen and has nowhere to scan. */
  onScanAgain?: () => void;
}

export function FoundProductScreen({ product, source, onScanAgain }: Props) {
  const { t } = useTranslation();
  const tabBarHeight = useBottomTabBarHeight();
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { message: toastMessage, showToast } = useToast();

  return (
    <View style={[styles.screen, { paddingBottom: tabBarHeight }]}>
      <ProductResultProvider product={product} source={source}>
        <ScrollView contentContainerStyle={styles.content}>
          <CopyableBarcode
            barcode={product.code}
            style={styles.barcodeChip}
            onCopied={() => showToast(t('qr.copied'))}
          />
          <ProductResultBody />
          {onScanAgain ? (
            <PillButton title={t('result.scanAnother')} onPress={onScanAgain} variant="punch" />
          ) : null}
        </ScrollView>
      </ProductResultProvider>
      <BottomBannerAd />
      <Toast message={toastMessage} bottom={tabBarHeight + BANNER_AD_RESERVED_HEIGHT + 16} />
    </View>
  );
}

function createStyles(colors: ColorTheme) {
  return StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: colors.cabinet,
    },
    content: {
      padding: 20,
      gap: 14,
      paddingBottom: 40,
    },
    barcodeChip: {
      alignSelf: 'flex-start',
    },
  });
}
