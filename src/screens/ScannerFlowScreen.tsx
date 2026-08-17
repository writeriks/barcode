import type { BottomTabNavigationProp, BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FadeSwitcher } from '../components/FadeSwitcher';
import { useScanInterstitial } from '../hooks/useScanInterstitial';
import { captureAnalyticsEvent } from '../services/analytics';
import { lookupProduct } from '../services/lookupProduct';
import { recordSuccessfulScan } from '../services/reviewPrompt';
import { addHistoryEntry } from '../services/scanHistory';
import { isBatchScanEnabled } from '../services/scannerPreference';
import { useThemeColors } from '../theme/ThemeContext';
import type { ColorTheme } from '../theme/colors';
import { classifyQrContent } from '../utils/classifyQrContent';
import type { RootTabParamList } from '../navigation/types';
import type { ScanKind, ScanMethod } from '../types/scan';
import type { LookupResult } from '../types/product';
import { DocumentEntryScreen } from './DocumentEntryScreen';
import { FoundProductScreen } from './FoundProductScreen';
import { LookupErrorScreen } from './LookupErrorScreen';
import { MissingProductScreen } from './MissingProductScreen';
import { QrResultScreen } from './QrResultScreen';
import { ScannerScreen } from './ScannerScreen';

type Props = BottomTabScreenProps<RootTabParamList, 'Scanner'>;

type Screen =
  | { name: 'scanner' }
  | { name: 'loading'; barcode: string }
  | { name: 'result'; result: LookupResult }
  | { name: 'qr-result'; data: string }
  | { name: 'document-result'; pageTexts: string[]; imageUris: string[]; timestamp: number };

/** Maps the internal lookup status to the analytics-friendly value —
 * 'not-found' has a hyphen internally but reads oddly as an event
 * property, so it's normalized to 'not_found'. */
function analyticsResultValue(status: LookupResult['status']): string {
  return status === 'not-found' ? 'not_found' : status;
}

/** The scan → result flow. Takes `navigation` only to reset to the camera
 * view when the already-active Scanner tab is re-tapped. */
export function ScannerFlowScreen({ navigation }: Props) {
  const [screen, setScreen] = useState<Screen>({ name: 'scanner' });
  const { maybeShowForScan } = useScanInterstitial();
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const lastMethodRef = useRef<ScanMethod>('camera');
  const [isBatchMode, setIsBatchMode] = useState(false);
  const [batchCount, setBatchCount] = useState(0);

  // Re-checked on every focus so flipping the Settings toggle takes effect
  // as soon as you come back to this tab, without needing an app restart.
  useFocusEffect(
    useCallback(() => {
      isBatchScanEnabled().then((enabled) => {
        setIsBatchMode(enabled);
        if (enabled) setBatchCount(0);
      });
    }, [])
  );

  // Re-tapping the already-active Scanner tab should feel like "start over",
  // not do nothing — pop back to the camera view from wherever we are.
  useEffect(() => {
    return navigation.addListener('tabPress', () => {
      if (navigation.isFocused()) {
        setScreen({ name: 'scanner' });
        setBatchCount(0);
      }
    });
  }, [navigation]);

  const runLookup = useCallback(
    async (barcode: string, method: ScanMethod = lastMethodRef.current) => {
      lastMethodRef.current = method;
      setScreen({ name: 'loading', barcode });
      const result = await lookupProduct(barcode);
      setScreen({ name: 'result', result });
      maybeShowForScan();
      captureAnalyticsEvent('scan_completed', { kind: 'barcode', method, result: analyticsResultValue(result.status) });

      if (result.status === 'found' || result.status === 'incomplete') {
        recordSuccessfulScan();
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

  // In batch mode the camera never leaves the scanner view, so a barcode's
  // lookup runs in the background instead of blocking the next scan —
  // there's no "loading"/"result" screen for it to drive.
  const runBatchBarcodeLookup = useCallback(async (barcode: string, method: ScanMethod, timestamp: number) => {
    const result = await lookupProduct(barcode);
    captureAnalyticsEvent('scan_completed', {
      kind: 'barcode',
      method,
      result: analyticsResultValue(result.status),
      batch: true,
    });
    if (result.status === 'found' || result.status === 'incomplete') {
      addHistoryEntry({ kind: 'product', barcode, timestamp, status: result.status, product: result.product });
    } else if (result.status === 'not-found') {
      addHistoryEntry({ kind: 'product', barcode, timestamp, status: 'not-found' });
    }
  }, []);

  const handleBatchScanned = useCallback(
    (data: string, kind: ScanKind, method: ScanMethod) => {
      setBatchCount((count) => count + 1);
      const timestamp = Date.now();
      if (kind === 'qr') {
        captureAnalyticsEvent('scan_completed', { kind: 'qr', method, result: 'found', batch: true });
        addHistoryEntry({ kind: 'qr', data, timestamp, contentType: classifyQrContent(data) });
        return;
      }
      runBatchBarcodeLookup(data, method, timestamp);
    },
    [runBatchBarcodeLookup]
  );

  const handleFinishBatch = useCallback(() => {
    setBatchCount(0);
    navigation.getParent<BottomTabNavigationProp<RootTabParamList>>()?.navigate('History');
  }, [navigation]);

  const handleScanned = useCallback(
    (data: string, kind: ScanKind, method: ScanMethod) => {
      if (isBatchMode) {
        handleBatchScanned(data, kind, method);
        return;
      }

      if (kind === 'barcode') {
        runLookup(data, method);
        return;
      }

      setScreen({ name: 'qr-result', data });
      maybeShowForScan();
      recordSuccessfulScan();
      captureAnalyticsEvent('scan_completed', { kind: 'qr', method, result: 'found' });
      addHistoryEntry({ kind: 'qr', data, timestamp: Date.now(), contentType: classifyQrContent(data) });
    },
    [runLookup, maybeShowForScan, isBatchMode, handleBatchScanned]
  );

  const handleDocumentScanned = useCallback((pageTexts: string[], imageUris: string[]) => {
    const timestamp = Date.now();
    setScreen({ name: 'document-result', pageTexts, imageUris, timestamp });
    recordSuccessfulScan();
    const hasAnyText = pageTexts.some((text) => text.trim().length > 0);
    captureAnalyticsEvent('scan_completed', {
      kind: 'document',
      method: 'document_camera',
      result: hasAnyText ? 'found' : 'not_found',
    });
    addHistoryEntry({ kind: 'document', pageTexts, imageUris, timestamp });
  }, []);

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

  const renderScreen = (): ReactNode => {
    switch (screen.name) {
      case 'scanner':
        return (
          <ScannerScreen
            onScanned={handleScanned}
            onDocumentScanned={handleDocumentScanned}
            batchMode={isBatchMode}
            batchCount={batchCount}
            onFinishBatch={handleFinishBatch}
          />
        );

      case 'document-result':
        return withTopSafeArea(
          <DocumentEntryScreen
            timestamp={screen.timestamp}
            pageTexts={screen.pageTexts}
            imageUris={screen.imageUris}
            isFreshScan
            onClose={goToScanner}
          />
        );

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
  };

  return <FadeSwitcher activeKey={screen.name}>{renderScreen()}</FadeSwitcher>;
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
