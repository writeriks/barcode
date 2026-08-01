import {
  useFonts,
  Fredoka_600SemiBold,
  Fredoka_700Bold,
} from '@expo-google-fonts/fredoka';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, SafeAreaView, StyleSheet, View } from 'react-native';
import { CaptureIngredientsScreen } from './src/screens/CaptureIngredientsScreen';
import { FoundProductScreen } from './src/screens/FoundProductScreen';
import { LookupErrorScreen } from './src/screens/LookupErrorScreen';
import { MissingProductScreen } from './src/screens/MissingProductScreen';
import { ScannerScreen } from './src/screens/ScannerScreen';
import { SettingsScreen } from './src/screens/SettingsScreen';
import { useScanInterstitial } from './src/hooks/useScanInterstitial';
import i18n, { isSupportedLanguage, type SupportedLanguage } from './src/i18n';
import { getLanguageOverride, setLanguageOverride } from './src/i18n/languagePreference';
import { initializeAds } from './src/services/ads/initializeAds';
import { lookupProduct } from './src/services/lookupProduct';
import { colors } from './src/theme/colors';
import { getDeviceLanguageCode } from './src/utils/locale';
import type { LookupResult } from './src/types/product';

type Screen =
  | { name: 'scanner' }
  | { name: 'loading'; barcode: string }
  | { name: 'result'; result: LookupResult }
  | { name: 'capture'; barcode: string }
  | { name: 'settings' };

export default function App() {
  const [screen, setScreen] = useState<Screen>({ name: 'scanner' });
  const [fontsLoaded] = useFonts({ Fredoka_600SemiBold, Fredoka_700Bold });
  const [languageOverride, setLanguageOverrideState] = useState<SupportedLanguage | null>(null);
  const [languageReady, setLanguageReady] = useState(false);
  const { maybeShowForScan } = useScanInterstitial();

  useEffect(() => {
    initializeAds();
  }, []);

  useEffect(() => {
    (async () => {
      const stored = await getLanguageOverride();
      if (stored) {
        await i18n.changeLanguage(stored);
        setLanguageOverrideState(stored);
      }
      setLanguageReady(true);
    })();
  }, []);

  const runLookup = useCallback(
    async (barcode: string) => {
      setScreen({ name: 'loading', barcode });
      const result = await lookupProduct(barcode);
      setScreen({ name: 'result', result });
      maybeShowForScan();
    },
    [maybeShowForScan]
  );

  const goToScanner = useCallback(() => setScreen({ name: 'scanner' }), []);

  const openSettings = useCallback(() => setScreen({ name: 'settings' }), []);
  const closeSettings = useCallback(() => setScreen({ name: 'scanner' }), []);

  const handleSelectLanguage = useCallback(async (code: SupportedLanguage | null) => {
    await setLanguageOverride(code);
    const deviceLanguage = getDeviceLanguageCode();
    const next = code ?? (isSupportedLanguage(deviceLanguage) ? deviceLanguage : 'en');
    await i18n.changeLanguage(next);
    setLanguageOverrideState(code);
  }, []);

  const renderScreen = () => {
    switch (screen.name) {
      case 'scanner':
        return <ScannerScreen onScanned={runLookup} onOpenSettings={openSettings} />;

      case 'loading':
        return (
          <View style={styles.center}>
            <ActivityIndicator size="large" color={colors.mint} />
          </View>
        );

      case 'capture':
        return (
          <CaptureIngredientsScreen
            barcode={screen.barcode}
            onDone={goToScanner}
            onCancel={goToScanner}
          />
        );

      case 'settings':
        return (
          <SettingsScreen
            currentOverride={languageOverride}
            onSelectLanguage={handleSelectLanguage}
            onClose={closeSettings}
          />
        );

      case 'result': {
        const { result } = screen;
        switch (result.status) {
          case 'found':
            return (
              <FoundProductScreen
                product={result.product}
                source={result.source}
                onScanAgain={goToScanner}
              />
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
  };

  if (!fontsLoaded || !languageReady) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.mint} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {renderScreen()}
      <StatusBar style="light" />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.cabinet,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.cabinet,
  },
});
