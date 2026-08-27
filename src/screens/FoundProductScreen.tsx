import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Image, ScrollView, StyleSheet, Text, View } from 'react-native';
import { BANNER_AD_RESERVED_HEIGHT, BottomBannerAd } from '../components/BottomBannerAd';
import { CopyableBarcode } from '../components/CopyableBarcode';
import { PillButton } from '../components/PillButton';
import { ScoreReveal } from '../components/ScoreReveal';
import { Toast } from '../components/Toast';
import { useToast } from '../hooks/useToast';
import { useThemeColors } from '../theme/ThemeContext';
import type { ColorTheme } from '../theme/colors';
import { fonts } from '../theme/fonts';
import type { Product, ProductSource } from '../types/product';

interface Props {
  product: Product;
  source: ProductSource;
  /** Live scan only. History reuses this screen and has nowhere to scan. */
  onScanAgain?: () => void;
}

const NUTRIMENT_ROWS: { key: string; labelKey: string; unitKey: string }[] = [
  { key: 'energy-kcal_100g', labelKey: 'result.nutriments.energy', unitKey: 'result.units.kcalPer100g' },
  { key: 'fat_100g', labelKey: 'result.nutriments.fat', unitKey: 'result.units.gPer100g' },
  { key: 'saturated-fat_100g', labelKey: 'result.nutriments.saturatedFat', unitKey: 'result.units.gPer100g' },
  { key: 'carbohydrates_100g', labelKey: 'result.nutriments.carbohydrates', unitKey: 'result.units.gPer100g' },
  { key: 'sugars_100g', labelKey: 'result.nutriments.sugars', unitKey: 'result.units.gPer100g' },
  { key: 'proteins_100g', labelKey: 'result.nutriments.protein', unitKey: 'result.units.gPer100g' },
  { key: 'salt_100g', labelKey: 'result.nutriments.salt', unitKey: 'result.units.gPer100g' },
];

export function FoundProductScreen({ product, source, onScanAgain }: Props) {
  const { t } = useTranslation();
  const tabBarHeight = useBottomTabBarHeight();
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { message: toastMessage, showToast } = useToast();
  const nutrimentRows = NUTRIMENT_ROWS.filter(
    (row) => typeof product.nutriments?.[row.key] === 'number'
  );
  // Prefer OFF's localized allergen names; fall back to the canonical
  // English tags if OFF has no translation for the requested language.
  const displayAllergens =
    product.allergens ?? product.allergensTags?.map((tag) => tag.replace(/^en:/, ''));

  return (
    <View style={[styles.screen, { paddingBottom: tabBarHeight }]}>
      <ScrollView contentContainerStyle={styles.content}>
        <CopyableBarcode
          barcode={product.code}
          style={styles.barcodeChip}
          onCopied={() => showToast(t('qr.copied'))}
        />

        <View style={styles.productCard}>
          {product.imageUrl ? (
            <Image source={{ uri: product.imageUrl }} style={styles.image} resizeMode="cover" />
          ) : null}
          <View style={styles.productText}>
            <Text style={styles.name} numberOfLines={2}>
              {product.productName ?? t('result.unnamedProduct')}
            </Text>
            {product.brands ? <Text style={styles.brand}>{product.brands}</Text> : null}
            {source === 'cache' ? <Text style={styles.verdict}>{t('result.fromLastScan')}</Text> : null}
          </View>
        </View>

        <View style={styles.scoreRow}>
          <ScoreReveal nutriscoreGrade={product.nutriscoreGrade} />
          <View style={styles.scoreLabelWrap}>
            <Text style={styles.scoreLabel}>{t('result.nutriScore')}</Text>
            {product.novaGroup ? (
              <Text style={styles.scoreSub}>{t('result.novaGroup', { group: product.novaGroup })}</Text>
            ) : null}
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>{t('result.ingredients')}</Text>
          <Text style={styles.body}>{product.ingredientsText ?? t('result.noIngredients')}</Text>
        </View>

        {displayAllergens && displayAllergens.length > 0 ? (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>{t('result.allergens')}</Text>
            <View style={styles.chips}>
              {displayAllergens.map((name) => (
                <View key={name} style={styles.chip}>
                  <Text style={styles.chipText}>{name}</Text>
                </View>
              ))}
            </View>
          </View>
        ) : null}

        {nutrimentRows.length > 0 ? (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>{t('result.nutrition')}</Text>
            {nutrimentRows.map((row) => (
              <View key={row.key} style={styles.nutrimentRow}>
                <Text style={styles.body}>{t(row.labelKey)}</Text>
                <Text style={styles.amount}>
                  {product.nutriments![row.key]} {t(row.unitKey)}
                </Text>
              </View>
            ))}
          </View>
        ) : null}

        {onScanAgain ? (
          <PillButton title={t('result.scanAnother')} onPress={onScanAgain} variant="punch" />
        ) : null}
      </ScrollView>
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
    image: {
      width: 64,
      height: 64,
      borderRadius: 12,
    },
    productCard: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 14,
      backgroundColor: colors.panel,
      borderWidth: 1,
      borderColor: colors.panelLine,
      borderRadius: 20,
      padding: 14,
    },
    productText: {
      flex: 1,
    },
    name: {
      fontFamily: fonts.displayBold,
      fontSize: 16,
      color: colors.text,
    },
    brand: {
      fontSize: 12.5,
      color: colors.text,
      opacity: 0.6,
      marginTop: 2,
    },
    verdict: {
      fontFamily: fonts.mono,
      fontSize: 10,
      letterSpacing: 1,
      textTransform: 'uppercase',
      color: colors.mintText,
      marginTop: 5,
    },
    scoreRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 14,
      backgroundColor: colors.panel,
      borderWidth: 1,
      borderColor: colors.panelLine,
      borderRadius: 20,
      padding: 14,
    },
    scoreLabelWrap: {
      flex: 1,
    },
    scoreLabel: {
      fontFamily: fonts.displayBold,
      fontSize: 14,
      color: colors.text,
    },
    scoreSub: {
      fontSize: 12,
      color: colors.text,
      opacity: 0.55,
      marginTop: 2,
    },
    card: {
      backgroundColor: colors.panel,
      borderWidth: 1,
      borderColor: colors.panelLine,
      borderRadius: 20,
      padding: 16,
      gap: 8,
    },
    sectionTitle: {
      fontFamily: fonts.displayBold,
      fontSize: 14,
      color: colors.text,
    },
    body: {
      fontSize: 13.5,
      lineHeight: 20,
      color: colors.text,
      opacity: 0.75,
    },
    chips: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 6,
    },
    chip: {
      borderWidth: 1,
      borderColor: colors.coralText,
      backgroundColor: 'rgba(255,90,90,0.12)',
      borderRadius: 999,
      paddingHorizontal: 10,
      paddingVertical: 5,
    },
    chipText: {
      fontFamily: fonts.mono,
      fontSize: 10.5,
      letterSpacing: 0.5,
      textTransform: 'uppercase',
      color: colors.coralText,
    },
    nutrimentRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      borderBottomWidth: 1,
      borderBottomColor: colors.panelLine,
      paddingBottom: 6,
    },
    amount: {
      fontFamily: fonts.mono,
      fontSize: 13,
      color: colors.text,
      opacity: 0.65,
    },
  });
}
