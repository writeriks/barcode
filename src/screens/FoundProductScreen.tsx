import { Button, Image, ScrollView, StyleSheet, Text, View } from 'react-native';
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
    <ScrollView contentContainerStyle={styles.content}>
      {product.imageUrl ? (
        <Image source={{ uri: product.imageUrl }} style={styles.image} resizeMode="contain" />
      ) : null}

      <Text style={styles.title}>{product.productName ?? 'Unnamed product'}</Text>
      {product.brands ? <Text style={styles.brand}>{product.brands}</Text> : null}

      <View style={styles.badgeRow}>
        {product.nutriscoreGrade ? (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>Nutri-Score {product.nutriscoreGrade.toUpperCase()}</Text>
          </View>
        ) : null}
        {product.novaGroup ? (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>NOVA {product.novaGroup}</Text>
          </View>
        ) : null}
        {source === 'cache' ? (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>From cache</Text>
          </View>
        ) : null}
      </View>

      <Text style={styles.sectionTitle}>Ingredients</Text>
      <Text style={styles.body}>{product.ingredientsText ?? 'No ingredients listed.'}</Text>

      {product.allergensTags && product.allergensTags.length > 0 ? (
        <>
          <Text style={styles.sectionTitle}>Allergens</Text>
          <Text style={styles.body}>
            {product.allergensTags.map((tag) => tag.replace(/^en:/, '')).join(', ')}
          </Text>
        </>
      ) : null}

      {nutrimentRows.length > 0 ? (
        <>
          <Text style={styles.sectionTitle}>Nutrition</Text>
          {nutrimentRows.map((row) => (
            <View key={row.key} style={styles.nutrimentRow}>
              <Text style={styles.body}>{row.label}</Text>
              <Text style={styles.body}>
                {product.nutriments![row.key]} {row.unit}
              </Text>
            </View>
          ))}
        </>
      ) : null}

      <Text style={styles.attribution}>Data from Open Food Facts (ODbL)</Text>

      <Button title="Scan another product" onPress={onScanAgain} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: 20,
    gap: 8,
  },
  image: {
    width: '100%',
    height: 200,
    marginBottom: 8,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
  },
  brand: {
    fontSize: 16,
    color: '#555',
    marginBottom: 8,
  },
  badgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 8,
  },
  badge: {
    backgroundColor: '#eee',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginTop: 12,
  },
  body: {
    fontSize: 14,
    lineHeight: 20,
  },
  nutrimentRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  attribution: {
    marginTop: 20,
    fontSize: 12,
    color: '#888',
    fontStyle: 'italic',
  },
});
