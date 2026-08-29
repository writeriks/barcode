import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import { useFocusEffect } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { ActivityIndicator, Alert, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FadeSwitcher } from '../components/FadeSwitcher';
import { useScanInterstitial } from '../hooks/useScanInterstitial';
import { usePremium } from '../premium/PremiumContext';
import { isFirstRunPaywallShown, setFirstRunPaywallShown } from '../services/firstRunPaywall';
import { captureAnalyticsEvent } from '../services/analytics';
import { lookupProduct } from '../services/lookupProduct';
import { recordSuccessfulScan } from '../services/reviewPrompt';
import { addHistoryEntry, type AddHistoryResult } from '../services/scanHistory';
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

/** What one batch scan came to. Everything but `saved` means History has
 *  nothing for it — two of those are a setting doing its job and worth
 *  saying out loud, the third is a lookup that simply failed. */
type BatchOutcome = AddHistoryResult | 'lookup-failed';

/** How long Done will wait for the last batch saves before going to
 *  History anyway. Long enough for a write and a quick lookup, short
 *  enough that a stalled network doesn't make the button feel broken. */
const BATCH_SAVE_WAIT_MS = 2500;

/** Maps the internal lookup status to the analytics-friendly value —
 * 'not-found' has a hyphen internally but reads oddly as an event
 * property, so it's normalized to 'not_found'. */
function analyticsResultValue(status: LookupResult['status']): string {
  return status === 'not-found' ? 'not_found' : status;
}

/** The scan → result flow. Takes `navigation` only to reset to the camera
 * view when the already-active Scanner tab is re-tapped. */
export function ScannerFlowScreen({ navigation }: Props) {
  const { t } = useTranslation();
  const [screen, setScreen] = useState<Screen>({ name: 'scanner' });
  const { countScan, maybeShowOnLeavingResult } = useScanInterstitial();
  const { isPremium, isReady: isPremiumReady, openPaywall } = usePremium();
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const lastMethodRef = useRef<ScanMethod>('camera');
  // What the tab-press listener below is looking at. A ref rather than a
  // dependency, so the listener isn't torn down and re-added every scan.
  const screenRef = useRef(screen);
  screenRef.current = screen;
  const [isBatchMode, setIsBatchMode] = useState(false);
  const [batchCount, setBatchCount] = useState(0);
  // Batch saves run in the background so the camera never waits on one.
  // Done has to, though — see handleFinishBatch.
  const pendingBatchSavesRef = useRef<Promise<unknown>[]>([]);
  // Why a batch scan didn't make it into History, if any didn't. Batch
  // mode has no result screen, so the entry is the only thing the user
  // gets — a scan that was silently dropped has to be accounted for.
  const batchSkipReasonRef = useRef<Exclude<BatchOutcome, 'saved' | 'lookup-failed'> | null>(null);

  const trackBatchSave = useCallback((work: Promise<BatchOutcome>) => {
    const tracked = work
      .then((result) => {
        // The counter follows what was kept, not what was seen. Counting
        // scans that were never saved and then landing on a History
        // without them is the app describing work it did not do.
        if (result === 'saved') setBatchCount((count) => count + 1);
        else if (result !== 'lookup-failed') batchSkipReasonRef.current ??= result;
      })
      // Swallowed here rather than at the call site: a lookup that fails
      // must not take the Done button's wait down with it.
      .catch(() => undefined);
    pendingBatchSavesRef.current.push(tracked);
  }, []);

  // Re-checked on every focus so flipping the Settings toggle takes effect
  // as soon as you come back to this tab, without needing an app restart.
  useFocusEffect(
    useCallback(() => {
      isBatchScanEnabled().then((enabled) => {
        setIsBatchMode(enabled);
        if (enabled) {
          setBatchCount(0);
          pendingBatchSavesRef.current = [];
          batchSkipReasonRef.current = null;
        }
      });
    }, [])
  );

  const runLookup = useCallback(
    async (barcode: string, method: ScanMethod = lastMethodRef.current) => {
      lastMethodRef.current = method;
      setScreen({ name: 'loading', barcode });
      const result = await lookupProduct(barcode);
      setScreen({ name: 'result', result });
      countScan();
      captureAnalyticsEvent('scan_completed', { kind: 'barcode', method, result: analyticsResultValue(result.status) });

      if (result.status === 'found' || result.status === 'incomplete') {
        recordSuccessfulScan();
        await addHistoryEntry({
          kind: 'product',
          barcode,
          timestamp: Date.now(),
          status: result.status,
          product: result.product,
        });
      } else if (result.status === 'not-found') {
        await addHistoryEntry({ kind: 'product', barcode, timestamp: Date.now(), status: 'not-found' });
      }
    },
    [countScan]
  );

  // In batch mode the camera never leaves the scanner view, so a barcode's
  // lookup runs in the background instead of blocking the next scan —
  // there's no "loading"/"result" screen for it to drive.
  const runBatchBarcodeLookup = useCallback(
    async (barcode: string, method: ScanMethod, timestamp: number): Promise<BatchOutcome> => {
      const result = await lookupProduct(barcode);
      captureAnalyticsEvent('scan_completed', {
        kind: 'barcode',
        method,
        result: analyticsResultValue(result.status),
        batch: true,
      });
      if (result.status === 'found' || result.status === 'incomplete') {
        return addHistoryEntry({
          kind: 'product',
          barcode,
          timestamp,
          status: result.status,
          product: result.product,
        });
      }
      if (result.status === 'not-found') {
        return addHistoryEntry({ kind: 'product', barcode, timestamp, status: 'not-found' });
      }
      // A lookup that failed outright saves nothing, and no setting is to
      // blame — it counts as neither kept nor skipped.
      return 'lookup-failed';
    },
    []
  );

  const handleBatchScanned = useCallback(
    (data: string, kind: ScanKind, method: ScanMethod) => {
      const timestamp = Date.now();
      if (kind === 'qr') {
        captureAnalyticsEvent('scan_completed', { kind: 'qr', method, result: 'found', batch: true });
        trackBatchSave(addHistoryEntry({ kind: 'qr', data, timestamp, contentType: classifyQrContent(data) }));
        return;
      }
      trackBatchSave(runBatchBarcodeLookup(data, method, timestamp));
    },
    [runBatchBarcodeLookup, trackBatchSave]
  );

  // `navigation` here is already the tab navigator's — this screen is a
  // Tab.Screen. Asking for its parent walks off the top of the tree and
  // returns undefined, so the optional call did nothing at all and Done
  // was a dead button. (History's copy of this line is right: that screen
  // sits inside HistoryStack, so it does have a tab navigator above it.)
  //
  // The wait is the other half of the same complaint. A batch save is
  // fired and not awaited — that is what keeps the camera responsive —
  // and a barcode's save sits behind a network lookup first. History
  // builds its list once, on focus, so arriving there before the last
  // write lands shows a log that is still being written and never
  // refreshes. The cap is there because Done must stay a button that
  // responds, even on a lookup that hangs.
  const handleFinishBatch = useCallback(async () => {
    await Promise.race([
      Promise.all(pendingBatchSavesRef.current),
      new Promise((resolve) => setTimeout(resolve, BATCH_SAVE_WAIT_MS)),
    ]);
    pendingBatchSavesRef.current = [];

    // Say so before navigating. Landing on a History that is missing the
    // scans, with nothing to explain it, is the part of this that reads
    // as the app being broken rather than as a setting doing its job.
    const skipped = batchSkipReasonRef.current;
    batchSkipReasonRef.current = null;
    setBatchCount(0);
    if (skipped) {
      Alert.alert(
        t('scanner.batchNotSavedTitle'),
        t(skipped === 'history-off' ? 'scanner.batchNotSavedHistoryOff' : 'scanner.batchNotSavedDuplicate')
      );
    }
    navigation.navigate('History');
  }, [navigation, t]);

  const handleScanned = useCallback(
    async (data: string, kind: ScanKind, method: ScanMethod) => {
      if (isBatchMode) {
        handleBatchScanned(data, kind, method);
        return;
      }

      if (kind === 'barcode') {
        await runLookup(data, method);
        return;
      }

      setScreen({ name: 'qr-result', data });
      countScan();
      recordSuccessfulScan();
      captureAnalyticsEvent('scan_completed', { kind: 'qr', method, result: 'found' });
      await addHistoryEntry({ kind: 'qr', data, timestamp: Date.now(), contentType: classifyQrContent(data) });
    },
    [runLookup, countScan, isBatchMode, handleBatchScanned]
  );

  const handleDocumentScanned = useCallback(async (pageTexts: string[], imageUris: string[]) => {
    const timestamp = Date.now();
    setScreen({ name: 'document-result', pageTexts, imageUris, timestamp });
    recordSuccessfulScan();
    const hasAnyText = pageTexts.some((text) => text.trim().length > 0);
    captureAnalyticsEvent('scan_completed', {
      kind: 'document',
      method: 'document_camera',
      result: hasAnyText ? 'found' : 'not_found',
    });
    await addHistoryEntry({ kind: 'document', pageTexts, imageUris, timestamp });
  }, []);

  /**
   * Leaving a result, which is where anything interrupting belongs.
   *
   * Two things can happen here and they are mutually exclusive. A new user
   * gets the upgrade pitch once, on the way back from their very first
   * result: they have just watched the app do the thing they installed it
   * for, so the pitch is about something they have seen work rather than
   * something described to them on a welcome screen. Everyone else may get
   * an ad, on the schedule in interstitialSchedule.
   *
   * Never both. The first scan is well inside the ad's warm-up period
   * anyway, but saying so here means the two can be tuned independently
   * without ever stacking on one another.
   */
  const goToScanner = useCallback(() => {
    setScreen({ name: 'scanner' });
    // Unresolved counts as premium here, the same way premiumState says it
    // should. Between launch and RevenueCat answering, `isPremium` reads
    // false for everyone — and a first scan can easily land inside that
    // window on a slow connection, which would put a purchase screen in
    // front of someone who has already bought it. The pitch is only spent
    // when it is actually shown, so waiting costs it nothing: the next
    // result offers it again.
    if (isPremium || !isPremiumReady) {
      maybeShowOnLeavingResult();
      return;
    }
    isFirstRunPaywallShown().then((shown) => {
      if (shown) {
        maybeShowOnLeavingResult();
        return;
      }
      void setFirstRunPaywallShown();
      openPaywall('firstScan');
    });
  }, [isPremium, isPremiumReady, maybeShowOnLeavingResult, openPaywall]);

  // Re-tapping the already-active Scanner tab should feel like "start
  // over", not do nothing — pop back to the camera view from wherever we
  // are.
  //
  // It goes through goToScanner rather than just resetting the screen,
  // because leaving a result this way is the same moment as leaving it by
  // the button on the result screen. The ad — and the one-off upgrade
  // pitch — belong to the moment the user is done with the answer, not to
  // which control they used to say so; routing one of the two doors past
  // them meant anyone who navigates by the tab bar never saw either.
  //
  // Only from a result, though. Tapping the tab while the camera is
  // already up is not leaving anything, and an ad there would arrive out
  // of nowhere.
  useEffect(() => {
    return navigation.addListener('tabPress', () => {
      if (!navigation.isFocused()) return;
      setBatchCount(0);
      if (screenRef.current.name === 'scanner') return;
      goToScanner();
    });
  }, [navigation, goToScanner]);

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
