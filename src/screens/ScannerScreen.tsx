import { CameraView, useCameraPermissions } from 'expo-camera';
import { useCallback, useRef } from 'react';
import { Button, StyleSheet, Text, View } from 'react-native';

interface Props {
  onScanned: (barcode: string) => void;
}

const SCANNED_BARCODE_TYPES = ['ean13', 'upc_a'] as const;

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
        <Button title="Grant camera permission" onPress={requestPermission} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <CameraView
        style={StyleSheet.absoluteFill}
        facing="back"
        barcodeScannerSettings={{ barcodeTypes: [...SCANNED_BARCODE_TYPES] }}
        onBarcodeScanned={handleBarcodeScanned}
      />
      <View style={styles.overlay} pointerEvents="none">
        <View style={styles.scanFrame} />
        <Text style={styles.hint}>Point the camera at a product barcode</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    padding: 24,
  },
  message: {
    textAlign: 'center',
  },
  overlay: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  scanFrame: {
    width: 260,
    height: 160,
    borderWidth: 2,
    borderColor: '#fff',
    borderRadius: 12,
  },
  hint: {
    color: '#fff',
    fontSize: 16,
  },
});
