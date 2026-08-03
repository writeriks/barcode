import { useCallback, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { useScanInterstitial } from '../hooks/useScanInterstitial';
import { addHistoryEntry } from '../services/scanHistory';
import { lookupProduct } from '../services/lookupProduct';
import { colors } from '../theme/colors';
import type { LookupResult } from '../types/product';
import { CaptureIngredientsScreen } from './CaptureIngredientsScreen';
import { FoundProductScreen } from './FoundProductScreen';
import { LookupErrorScreen } from './LookupErrorScreen';
import { MissingProductScreen } from './MissingProductScreen';
import { ScannerScreen } from './ScannerScreen';

type Screen =
  | { name: 'scanner' }
  | { name: 'loading'; barcode: string }
  | { name: 'result'; result: LookupResult }
  | { name: 'capture'; barcode: string };

/** The scan → result → (optional capture) flow, self-contained so it can
 * sit inside the "Scanner" tab without knowing anything about the tab
 * navigator around it. */
export function ScannerFlowScreen() {
  const [screen, setScreen] = useState<Screen>({ name: 'scanner' });
  const { maybeShowForScan } = useScanInterstitial();

  const runLookup = useCallback(
    async (barcode: string) => {
      setScreen({ name: 'loading', barcode });
      const result = await lookupProduct(barcode);
      setScreen({ name: 'result', result });
      maybeShowForScan();

      if (result.status === 'found' || result.status === 'incomplete') {
        addHistoryEntry({
          barcode,
          timestamp: Date.now(),
          status: result.status,
          product: result.product,
        });
      } else if (result.status === 'not-found') {
        addHistoryEntry({ barcode, timestamp: Date.now(), status: 'not-found' });
      }
    },
    [maybeShowForScan]
  );

  const goToScanner = useCallback(() => setScreen({ name: 'scanner' }), []);

  switch (screen.name) {
    case 'scanner':
      return <ScannerScreen onScanned={runLookup} />;

    case 'loading':
      return (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.mint} />
        </View>
      );

    case 'capture':
      return (
        <CaptureIngredientsScreen barcode={screen.barcode} onDone={goToScanner} onCancel={goToScanner} />
      );

    case 'result': {
      const { result } = screen;
      switch (result.status) {
        case 'found':
          return (
            <FoundProductScreen product={result.product} source={result.source} onScanAgain={goToScanner} />
          );
        case 'incomplete':
          return (
            <MissingProductScreen
              barcode={result.product.code}
              product={result.product}
              onCapturePhoto={() => setScreen({ name: 'capture', barcode: result.product.code })}
              onScanAgain={goToScanner}
            />
          );
        case 'not-found':
          return (
            <MissingProductScreen
              barcode={result.barcode}
              onCapturePhoto={() => setScreen({ name: 'capture', barcode: result.barcode })}
              onScanAgain={goToScanner}
            />
          );
        case 'error':
          return (
            <LookupErrorScreen
              message={result.message}
              onRetry={() => runLookup(result.barcode)}
              onScanAgain={goToScanner}
            />
          );
      }
    }
  }
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.cabinet,
  },
});
