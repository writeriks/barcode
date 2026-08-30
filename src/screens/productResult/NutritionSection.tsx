import { Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useProductResult, type ProductResultSection } from './ProductResultContext';

const NUTRIMENT_ROWS: { key: string; labelKey: string; unitKey: string }[] = [
  { key: 'energy-kcal_100g', labelKey: 'result.nutriments.energy', unitKey: 'result.units.kcalPer100g' },
  { key: 'fat_100g', labelKey: 'result.nutriments.fat', unitKey: 'result.units.gPer100g' },
  { key: 'saturated-fat_100g', labelKey: 'result.nutriments.saturatedFat', unitKey: 'result.units.gPer100g' },
  { key: 'carbohydrates_100g', labelKey: 'result.nutriments.carbohydrates', unitKey: 'result.units.gPer100g' },
  { key: 'sugars_100g', labelKey: 'result.nutriments.sugars', unitKey: 'result.units.gPer100g' },
  { key: 'proteins_100g', labelKey: 'result.nutriments.protein', unitKey: 'result.units.gPer100g' },
  { key: 'salt_100g', labelKey: 'result.nutriments.salt', unitKey: 'result.units.gPer100g' },
];

function NutritionSection() {
  const { t } = useTranslation();
  const { product, styles } = useProductResult();
  const rows = NUTRIMENT_ROWS.filter((row) => typeof product.nutriments?.[row.key] === 'number');
  if (rows.length === 0) return null;

  return (
    <View style={styles.card}>
      <Text style={styles.sectionTitle}>{t('result.nutrition')}</Text>
      {rows.map((row) => (
        <View key={row.key} style={styles.nutrimentRow}>
          <Text style={styles.body}>{t(row.labelKey)}</Text>
          <Text style={styles.amount}>
            {product.nutriments![row.key]} {t(row.unitKey)}
          </Text>
        </View>
      ))}
    </View>
  );
}

export const nutritionSection: ProductResultSection = {
  id: 'nutrition',
  Component: NutritionSection,
};
