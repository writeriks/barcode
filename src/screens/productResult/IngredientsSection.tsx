import { Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useProductResult, type ProductResultSection } from './ProductResultContext';

function IngredientsSection() {
  const { t } = useTranslation();
  const { product, styles } = useProductResult();
  if (!product.ingredientsText) return null;

  return (
    <View style={styles.card}>
      <Text style={styles.sectionTitle}>{t('result.ingredients')}</Text>
      <Text style={styles.body}>{product.ingredientsText}</Text>
    </View>
  );
}

export const ingredientsSection: ProductResultSection = {
  id: 'ingredients',
  Component: IngredientsSection,
};
