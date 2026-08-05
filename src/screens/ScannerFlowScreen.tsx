import { useCallback, useMemo, useRef, useState, type ReactNode } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useScanInterstitial } from '../hooks/useScanInterstitial';
import { captureAnalyticsEvent } from '../services/analytics';
import { lookupProduct } from '../services/lookupProduct';
import { addHistoryEntry } from '../services/scanHistory';
import { useThemeColors } from '../theme/ThemeContext';
import type { ColorTheme } from '../theme/colors';
import { classifyQrContent } from '../utils/classifyQrContent';
import type { ScanKind, ScanMethod } from '../types/scan';
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

/** Maps the internal lookup status to the analytics-friendly value —
 * 'not-found' has a hyphen internally but reads oddly as an event
 * property, so it's normalized to 'not_found'. */
function analyticsResultValue(status: LookupResult['status']): string {
  return status === 'not-found' ? 'not_found' : status;
}

/** The scan → result flow, self-contained so it can sit inside the
 * "Scanner" tab without knowing anything about the tab navigator around
 * it. */
export function ScannerFlowScreen() {
  const [screen, setScreen] = useState<Screen>({ name: 'scanner' });
  const { maybeShowForScan } = useScanInterstitial();
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const lastMethodRef = useRef<ScanMethod>('camera');

  const runLookup = useCallback(
    async (barcode: string, method: ScanMethod = lastMethodRef.current) => {
      lastMethodRef.current = method;
      setScreen({ name: 'loading', barcode });
      const result = await lookupProduct(barcode);
      setScreen({ name: 'result', result });
      maybeShowForScan();
      captureAnalyticsEvent('scan_completed', { kind: 'barcode', method, result: analyticsResultValue(result.status) });

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
    (data: string, kind: ScanKind, method: ScanMethod) => {
      if (kind === 'barcode') {
        runLookup(data, method);
        return;
      }

      setScreen({ name: 'qr-result', data });
      maybeShowForScan();
      captureAnalyticsEvent('scan_completed', { kind: 'qr', method, result: 'found' });
      addHistoryEntry({ kind: 'qr', data, timestamp: Date.now(), contentType: classifyQrContent(data) });
    },
    [runLookup, maybeShowForScan]
  );

  const goToScanner = useCallback(() => setScreen({ name: 'scanner' }), []);

  // ScannerScreen is deliberately edge-to-edge (it's a camera viewfinder),
  // but the result screens below it have no navigation header of their own
  // to clear the status bar/notch — unlike the same screens reached from
  // History, which already sit under HistoryStack's native header.
  const withTopSafeArea = (children: ReactNode) => (
    <SafeAreaView style={styles.flex} edges={['top', 'left', 'right']}>
      {children}
    </SafeAreaView>
  );

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
      return withTopSafeArea(<QrResultScreen data={screen.data} onScanAgain={goToScanner} />);

    case 'result': {
      const { result } = screen;
      switch (result.status) {
        case 'found':
          return withTopSafeArea(
            <FoundProductScreen product={result.product} source={result.source} onScanAgain={goToScanner} />
          );
        case 'incomplete':
          return withTopSafeArea(
            <FoundProductScreen product={result.product} source="network" onScanAgain={goToScanner} />
          );
        case 'not-found':
          return withTopSafeArea(<MissingProductScreen barcode={result.barcode} onScanAgain={goToScanner} />);
        case 'error':
          return withTopSafeArea(
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
    flex: {
      flex: 1,
    },
  });
}
