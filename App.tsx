import { StatusBar } from 'expo-status-bar';
import { useCallback, useState } from 'react';
import { ActivityIndicator, SafeAreaView, StyleSheet, View } from 'react-native';
import { CaptureIngredientsScreen } from './src/screens/CaptureIngredientsScreen';
import { FoundProductScreen } from './src/screens/FoundProductScreen';
import { LookupErrorScreen } from './src/screens/LookupErrorScreen';
import { MissingProductScreen } from './src/screens/MissingProductScreen';
import { ScannerScreen } from './src/screens/ScannerScreen';
import { lookupProduct } from './src/services/lookupProduct';
import type { LookupResult } from './src/types/product';

type Screen =
  | { name: 'scanner' }
  | { name: 'loading'; barcode: string }
  | { name: 'result'; result: LookupResult }
  | { name: 'capture'; barcode: string };

export default function App() {
  const [screen, setScreen] = useState<Screen>({ name: 'scanner' });

  const runLookup = useCallback(async (barcode: string) => {
    setScreen({ name: 'loading', barcode });
    const result = await lookupProduct(barcode);
    setScreen({ name: 'result', result });
  }, []);

  const goToScanner = useCallback(() => setScreen({ name: 'scanner' }), []);

  const renderScreen = () => {
    switch (screen.name) {
      case 'scanner':
        return <ScannerScreen onScanned={runLookup} />;

      case 'loading':
        return (
          <View style={styles.center}>
            <ActivityIndicator size="large" />
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

  return (
    <SafeAreaView style={styles.container}>
      {renderScreen()}
      <StatusBar style="auto" />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
