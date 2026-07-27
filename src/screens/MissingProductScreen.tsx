import { Button, StyleSheet, Text, View } from 'react-native';
import type { Product } from '../types/product';

interface Props {
  barcode: string;
  /** Present when OFF had a partial record (incomplete), absent for a
   * true not-found — lets us show whatever name/brand we do have. */
  product?: Product;
  onCapturePhoto: () => void;
  onScanAgain: () => void;
}

export function MissingProductScreen({ barcode, product, onCapturePhoto, onScanAgain }: Props) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>We don't have this one yet</Text>
      {product?.productName ? (
        <Text style={styles.body}>
          We found "{product.productName}" but don't have full ingredient details for it.
        </Text>
      ) : (
        <Text style={styles.body}>
          We couldn't find ingredient details for barcode {barcode}.
        </Text>
      )}
      <Text style={styles.body}>
        Help us out by photographing the ingredients label — we'll use it to fill in the gap.
      </Text>

      <View style={styles.actions}>
        <Button title="Photograph ingredients label" onPress={onCapturePhoto} />
        <Button title="Scan another product" onPress={onScanAgain} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    gap: 12,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
  },
  body: {
    fontSize: 15,
    textAlign: 'center',
    color: '#444',
  },
  actions: {
    marginTop: 16,
    gap: 12,
    alignSelf: 'stretch',
  },
});
