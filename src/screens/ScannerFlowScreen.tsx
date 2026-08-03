import { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { useScanInterstitial } from '../hooks/useScanInterstitial';
import { lookupProduct } from '../services/lookupProduct';
import { addHistoryEntry } from '../services/scanHistory';
import { useThemeColors } from '../theme/ThemeContext';
import type { ColorTheme } from '../theme/colors';
import { classifyQrContent } from '../utils/classifyQrContent';
import type { ScanKind } from '../types/scan';
import type { LookupResult } from '../types/product';
import { FoundProductScreen } from './FoundProductScreen';
import { LookupErrorScreen } from './LookupErrorScreen';
import { MissingProductScreen } from './MissingProductScreen';
import { QrResultScreen } from './QrResultScreen';
import { ScannerScreen } from './ScannerScreen';

type Screen =
  | { name: 'scanner' }
  | { name: 'loading'; barcode: string }
  | { name: 'result'; result: LookupResult }
  | { name: 'qr-result'; data: string };

/** The scan → result flow, self-contained so it can sit inside the
 * "Scanner" tab without knowing anything about the tab navigator around
 * it. */
export function ScannerFlowScreen() {
  const [screen, setScreen] = useState<Screen>({ name: 'scanner' });
  const { maybeShowForScan } = useScanInterstitial();
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const runLookup = useCallback(
    async (barcode: string) => {
      setScreen({ name: 'loading', barcode });
      const result = await lookupProduct(barcode);
      setScreen({ name: 'result', result });
      maybeShowForScan();

      if (result.status === 'found' || result.status === 'incomplete') {
        addHistoryEntry({
          kind: 'product',
          barcode,
          timestamp: Date.now(),
          status: result.status,
          product: result.product,
        });
      } else if (result.status === 'not-found') {
        addHistoryEntry({ kind: 'product', barcode, timestamp: Date.now(), status: 'not-found' });
      }
    },
    [maybeShowForScan]
  );

  const handleScanned = useCallback(
    (data: string, kind: ScanKind) => {
      if (kind === 'barcode') {
        runLookup(data);
        return;
      }

      setScreen({ name: 'qr-result', data });
      maybeShowForScan();
      addHistoryEntry({ kind: 'qr', data, timestamp: Date.now(), contentType: classifyQrContent(data) });
    },
    [runLookup, maybeShowForScan]
  );

  const goToScanner = useCallback(() => setScreen({ name: 'scanner' }), []);

  switch (screen.name) {
    case 'scanner':
      return <ScannerScreen onScanned={handleScanned} />;

    case 'loading':
      return (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.mint} />
        </View>
      );

    case 'qr-result':
      return <QrResultScreen data={screen.data} onScanAgain={goToScanner} />;

    case 'result': {
      const { result } = screen;
      switch (result.status) {
        case 'found':
          return (
            <FoundProductScreen product={result.product} source={result.source} onScanAgain={goToScanner} />
          );
        case 'incomplete':
          return (
            <FoundProductScreen product={result.product} source="network" onScanAgain={goToScanner} />
          );
        case 'not-found':
          return <MissingProductScreen barcode={result.barcode} onScanAgain={goToScanner} />;
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

function createStyles(colors: ColorTheme) {
  return StyleSheet.create({
    center: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.cabinet,
    },
  });
}
