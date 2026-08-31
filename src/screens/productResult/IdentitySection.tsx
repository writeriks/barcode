import { Image, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useProductResult, type ProductResultSection } from './ProductResultContext';

function IdentitySection() {
  const { t } = useTranslation();
  const { product, source, styles } = useProductResult();

  return (
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
  );
}

export const identitySection: ProductResultSection = {
  id: 'identity',
  Component: IdentitySection,
};
