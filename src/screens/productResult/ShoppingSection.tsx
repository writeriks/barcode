import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Linking, Text, View } from 'react-native';
import { PillButton } from '../../components/PillButton';
import { useProductResult, type ProductResultSection } from './ProductResultContext';

const ATTRIBUTION_KEYS: Record<string, string> = {
  'Yahoo! Shopping': 'result.attributionYahoo',
  Taobao: 'result.attributionTaobao',
};

function ShoppingSection() {
  const { t, i18n } = useTranslation();
  const { product, styles } = useProductResult();
  const shopping = product.shopping;
  const priceLabel = useMemo(() => {
    if (shopping?.price === undefined) return null;
    try {
      return new Intl.NumberFormat(i18n.language, {
        style: shopping.currency ? 'currency' : 'decimal',
        currency: shopping.currency || undefined,
        maximumFractionDigits: 0,
      }).format(shopping.price);
    } catch {
      return shopping.currency ? `${shopping.price} ${shopping.currency}` : String(shopping.price);
    }
  }, [i18n.language, shopping?.price, shopping?.currency]);

  if (!shopping || (!priceLabel && !shopping.category && !shopping.url)) return null;

  return (
    <View style={styles.card}>
      {priceLabel ? (
        <Text style={styles.body}>
          {t('result.price')}: {priceLabel}
        </Text>
      ) : null}
      {shopping.category ? (
        <Text style={styles.body}>
          {t('result.category')}: {shopping.category}
        </Text>
      ) : null}
      {shopping.url ? (
        <PillButton title={t('result.openInStore')} onPress={() => Linking.openURL(shopping.url!)} variant="ghost" />
      ) : null}
      {shopping.attribution ? (
        <Text style={styles.attribution}>
          {ATTRIBUTION_KEYS[shopping.attribution]
            ? t(ATTRIBUTION_KEYS[shopping.attribution])
            : shopping.attribution}
        </Text>
      ) : null}
    </View>
  );
}

export const shoppingSection: ProductResultSection = {
  id: 'shopping',
  Component: ShoppingSection,
};
