import { Image, ScrollView, StyleSheet, Text, View } from 'react-native';
import { PillButton } from '../components/PillButton';
import { ScoreReveal } from '../components/ScoreReveal';
import { colors } from '../theme/colors';
import { fonts } from '../theme/fonts';
import type { Product, ProductSource } from '../types/product';

interface Props {
  product: Product;
  source: ProductSource;
  onScanAgain: () => void;
}

const NUTRIMENT_ROWS: { key: string; label: string; unit: string }[] = [
  { key: 'energy-kcal_100g', label: 'Energy', unit: 'kcal / 100g' },
  { key: 'fat_100g', label: 'Fat', unit: 'g / 100g' },
  { key: 'saturated-fat_100g', label: 'Saturated fat', unit: 'g / 100g' },
  { key: 'carbohydrates_100g', label: 'Carbohydrates', unit: 'g / 100g' },
  { key: 'sugars_100g', label: 'Sugars', unit: 'g / 100g' },
  { key: 'proteins_100g', label: 'Protein', unit: 'g / 100g' },
  { key: 'salt_100g', label: 'Salt', unit: 'g / 100g' },
];

export function FoundProductScreen({ product, source, onScanAgain }: Props) {
  const nutrimentRows = NUTRIMENT_ROWS.filter(
    (row) => typeof product.nutriments?.[row.key] === 'number'
  );

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Text style={styles.barcode}>{product.code}</Text>

      <View style={styles.productCard}>
        {product.imageUrl ? (
          <Image source={{ uri: product.imageUrl }} style={styles.image} resizeMode="cover" />
        ) : null}
        <View style={styles.productText}>
          <Text style={styles.name} numberOfLines={2}>
            {product.productName ?? 'Unnamed product'}
          </Text>
          {product.brands ? <Text style={styles.brand}>{product.brands}</Text> : null}
          {source === 'cache' ? <Text style={styles.verdict}>From your last scan</Text> : null}
        </View>
      </View>

      <View style={styles.scoreRow}>
        <ScoreReveal nutriscoreGrade={product.nutriscoreGrade} />
        <View style={styles.scoreLabelWrap}>
          <Text style={styles.scoreLabel}>Nutri-Score</Text>
          {product.novaGroup ? <Text style={styles.scoreSub}>NOVA group {product.novaGroup}</Text> : null}
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Ingredients</Text>
        <Text style={styles.body}>{product.ingredientsText ?? 'No ingredients listed.'}</Text>
      </View>

      {product.allergensTags && product.allergensTags.length > 0 ? (
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Allergens</Text>
          <View style={styles.chips}>
            {product.allergensTags.map((tag) => (
              <View key={tag} style={styles.chip}>
                <Text style={styles.chipText}>{tag.replace(/^en:/, '')}</Text>
              </View>
            ))}
          </View>
        </View>
      ) : null}

      {nutrimentRows.length > 0 ? (
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Nutrition</Text>
          {nutrimentRows.map((row) => (
            <View key={row.key} style={styles.nutrimentRow}>
              <Text style={styles.body}>{row.label}</Text>
              <Text style={styles.amount}>
                {product.nutriments![row.key]} {row.unit}
              </Text>
            </View>
          ))}
        </View>
      ) : null}

      <Text style={styles.attribution}>Data from Open Food Facts (ODbL)</Text>

      <PillButton title="Scan another product" onPress={onScanAgain} variant="punch" />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
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
    color: colors.cream,
    opacity: 0.55,
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
    color: colors.cream,
  },
  brand: {
    fontSize: 12.5,
    color: colors.cream,
    opacity: 0.6,
    marginTop: 2,
  },
  verdict: {
    fontFamily: fonts.mono,
    fontSize: 10,
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: colors.mint,
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
    color: colors.cream,
  },
  scoreSub: {
    fontSize: 12,
    color: colors.cream,
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
    color: colors.cream,
  },
  body: {
    fontSize: 13.5,
    lineHeight: 20,
    color: colors.cream,
    opacity: 0.75,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  chip: {
    borderWidth: 1,
    borderColor: colors.coral,
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
    color: colors.coral,
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
    color: colors.cream,
    opacity: 0.65,
  },
  attribution: {
    fontSize: 11,
    color: colors.cream,
    opacity: 0.4,
    fontStyle: 'italic',
    textAlign: 'center',
    marginTop: 4,
  },
});
