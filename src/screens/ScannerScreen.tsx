import { CameraView, useCameraPermissions } from 'expo-camera';
import { useCallback, useEffect, useRef } from 'react';
import { Animated, Button, Easing, StyleSheet, Text, View } from 'react-native';
import { colors } from '../theme/colors';
import { fonts } from '../theme/fonts';

interface Props {
  onScanned: (barcode: string) => void;
}

const SCANNED_BARCODE_TYPES = ['ean13', 'upc_a'] as const;
const VIEWFINDER_HEIGHT = 130;

/**
 * Scans EAN-13/UPC-A barcodes. `hasHandledScanRef` makes sure a single
 * physical scan only fires `onScanned` once, even though onBarcodeScanned
 * keeps firing for every frame the barcode stays in view — the parent is
 * expected to unmount this screen once it navigates away to look up the
 * result, which also stops the camera.
 */
export function ScannerScreen({ onScanned }: Props) {
  const [permission, requestPermission] = useCameraPermissions();
  const hasHandledScanRef = useRef(false);

  const pulse = useRef(new Animated.Value(0)).current;
  const sweep = useRef(new Animated.Value(0)).current;
  const blink = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const pulseLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 1600, easing: Easing.inOut(Easing.ease), useNativeDriver: false }),
        Animated.timing(pulse, { toValue: 0, duration: 1600, easing: Easing.inOut(Easing.ease), useNativeDriver: false }),
      ])
    );
    const sweepLoop = Animated.loop(
      Animated.timing(sweep, { toValue: 1, duration: 1700, easing: Easing.inOut(Easing.sin), useNativeDriver: true })
    );
    const blinkLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(blink, { toValue: 0.35, duration: 700, useNativeDriver: true }),
        Animated.timing(blink, { toValue: 1, duration: 700, useNativeDriver: true }),
      ])
    );
    pulseLoop.start();
    sweepLoop.start();
    blinkLoop.start();
    return () => {
      pulseLoop.stop();
      sweepLoop.stop();
      blinkLoop.stop();
    };
  }, [pulse, sweep, blink]);

  const handleBarcodeScanned = useCallback(
    ({ data }: { data: string }) => {
      if (hasHandledScanRef.current) return;
      hasHandledScanRef.current = true;
      onScanned(data);
    },
    [onScanned]
  );

  if (!permission) {
    return <View style={styles.center} />;
  }

  if (!permission.granted) {
    return (
      <View style={styles.center}>
        <Text style={styles.message}>We need camera access to scan barcodes.</Text>
        <Button title="Grant camera permission" onPress={requestPermission} color={colors.mint} />
      </View>
    );
  }

  const borderColor = pulse.interpolate({ inputRange: [0, 1], outputRange: [colors.punch, colors.mint] });
  const sweepTranslate = sweep.interpolate({ inputRange: [0, 1], outputRange: [8, VIEWFINDER_HEIGHT - 8] });
  const sweepOpacity = sweep.interpolate({ inputRange: [0, 0.12, 0.5, 0.62, 1], outputRange: [0, 1, 1, 0, 0] });

  return (
    <View style={styles.container}>
      <CameraView
        style={StyleSheet.absoluteFill}
        facing="back"
        barcodeScannerSettings={{ barcodeTypes: [...SCANNED_BARCODE_TYPES] }}
        onBarcodeScanned={handleBarcodeScanned}
      />
      <View style={styles.overlay} pointerEvents="none">
        <Animated.View style={[styles.viewfinder, { borderColor }]}>
          <Animated.View
            style={[
              styles.scanline,
              { transform: [{ translateY: sweepTranslate }], opacity: sweepOpacity },
            ]}
          />
        </Animated.View>
        <Text style={styles.title}>Find a barcode</Text>
        <View style={styles.chip}>
          <Animated.View style={[styles.dot, { opacity: blink }]} />
          <Text style={styles.chipLabel}>Listening for EAN-13 / UPC-A</Text>
        </View>
      </View>
    </View>
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
    gap: 12,
    padding: 24,
    backgroundColor: colors.cabinet,
  },
  message: {
    textAlign: 'center',
    color: colors.cream,
  },
  overlay: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 22,
  },
  viewfinder: {
    width: 196,
    height: VIEWFINDER_HEIGHT,
    borderWidth: 3,
    borderRadius: 22,
    overflow: 'hidden',
  },
  scanline: {
    position: 'absolute',
    left: '6%',
    width: '88%',
    height: 3,
    borderRadius: 2,
    backgroundColor: colors.mint,
  },
  title: {
    fontFamily: fonts.displayBold,
    fontSize: 17,
    color: colors.cream,
    textAlign: 'center',
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.panel,
    borderWidth: 1,
    borderColor: colors.panelLine,
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 999,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.mint,
  },
  chipLabel: {
    fontFamily: fonts.mono,
    fontSize: 11,
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: colors.cream,
    opacity: 0.85,
  },
});
