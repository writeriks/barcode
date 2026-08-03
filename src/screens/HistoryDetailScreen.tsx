import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Image, ScrollView, StyleSheet, Text, View } from 'react-native';
import { HistoryStatusBadge } from '../components/HistoryStatusBadge';
import { QrContentView } from '../components/QrContentView';
import { useThemeColors } from '../theme/ThemeContext';
import type { ColorTheme } from '../theme/colors';
import { fonts } from '../theme/fonts';
import type { HistoryStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<HistoryStackParamList, 'HistoryDetail'>;

const NUTRIMENT_ROWS: { key: string; labelKey: string; unitKey: string }[] = [
  { key: 'energy-kcal_100g', labelKey: 'result.nutriments.energy', unitKey: 'result.units.kcalPer100g' },
  { key: 'fat_100g', labelKey: 'result.nutriments.fat', unitKey: 'result.units.gPer100g' },
  { key: 'saturated-fat_100g', labelKey: 'result.nutriments.saturatedFat', unitKey: 'result.units.gPer100g' },
  { key: 'carbohydrates_100g', labelKey: 'result.nutriments.carbohydrates', unitKey: 'result.units.gPer100g' },
  { key: 'sugars_100g', labelKey: 'result.nutriments.sugars', unitKey: 'result.units.gPer100g' },
  { key: 'proteins_100g', labelKey: 'result.nutriments.protein', unitKey: 'result.units.gPer100g' },
  { key: 'salt_100g', labelKey: 'result.nutriments.salt', unitKey: 'result.units.gPer100g' },
];

/** A read-only snapshot of a past scan — no live re-fetch, no reveal
 * animation (this isn't a fresh result, so replaying that felt wrong). */
export function HistoryDetailScreen({ route }: Props) {
  const { t } = useTranslation();
  const tabBarHeight = useBottomTabBarHeight();
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { entry } = route.params;

  if (entry.kind === 'qr') {
    return (
      <ScrollView
        style={styles.screen}
        contentContainerStyle={[styles.content, { paddingBottom: 40 + tabBarHeight }]}
      >
        <QrContentView data={entry.data} />
      </ScrollView>
    );
  }

  const { product } = entry;
  const nutrimentRows = NUTRIMENT_ROWS.filter(
    (row) => typeof product?.nutriments?.[row.key] === 'number'
  );
  const displayAllergens = product?.allergens ?? product?.allergensTags?.map((tag) => tag.replace(/^en:/, ''));

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={[styles.content, { paddingBottom: 40 + tabBarHeight }]}
    >
      <Text style={styles.barcode}>{entry.barcode}</Text>

      <View style={styles.productCard}>
        {product?.imageUrl ? (
          <Image source={{ uri: product.imageUrl }} style={styles.image} resizeMode="cover" />
        ) : null}
        <View style={styles.productText}>
          <Text style={styles.name} numberOfLines={2}>
            {product?.productName ?? t('result.unnamedProduct')}
          </Text>
          {product?.brands ? <Text style={styles.brand}>{product.brands}</Text> : null}
        </View>
        <HistoryStatusBadge entry={entry} />
      </View>

      {product?.ingredientsText ? (
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>{t('result.ingredients')}</Text>
          <Text style={styles.body}>{product.ingredientsText}</Text>
        </View>
      ) : null}

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
                {product!.nutriments![row.key]} {t(row.unitKey)}
              </Text>
            </View>
          ))}
        </View>
      ) : null}

      <Text style={styles.attribution}>{t('result.attribution')}</Text>
    </ScrollView>
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
    barcode: {
      fontFamily: fonts.mono,
      fontSize: 11,
      letterSpacing: 1,
      color: colors.text,
      opacity: 0.55,
    },
    image: {
      width: 56,
      height: 56,
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
    attribution: {
      fontSize: 11,
      color: colors.text,
      opacity: 0.4,
      fontStyle: 'italic',
      textAlign: 'center',
      marginTop: 4,
    },
  });
}
