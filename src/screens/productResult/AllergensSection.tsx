import { Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useProductResult, type ProductResultSection } from './ProductResultContext';

function AllergensSection() {
  const { t } = useTranslation();
  const { product, styles } = useProductResult();
  const displayAllergens =
    product.allergens ?? product.allergensTags?.map((tag) => tag.replace(/^en:/, ''));
  if (!displayAllergens || displayAllergens.length === 0) return null;

  return (
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
  );
}

export const allergensSection: ProductResultSection = {
  id: 'allergens',
  Component: AllergensSection,
};
