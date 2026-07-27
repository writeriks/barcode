import { CameraView, useCameraPermissions } from 'expo-camera';
import { useRef, useState } from 'react';
import { ActivityIndicator, Button, StyleSheet, Text, View } from 'react-native';
import { submitIngredientsPhoto } from '../services/submitIngredientsPhoto';

interface Props {
  barcode: string;
  onDone: () => void;
  onCancel: () => void;
}

export function CaptureIngredientsScreen({ barcode, onDone, onCancel }: Props) {
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<CameraView>(null);
  const [isCapturing, setIsCapturing] = useState(false);

  const handleCapture = async () => {
    if (!cameraRef.current || isCapturing) return;
    setIsCapturing(true);
    try {
      const photo = await cameraRef.current.takePictureAsync({ quality: 0.5 });
      await submitIngredientsPhoto(barcode, photo.uri);
      onDone();
    } finally {
      setIsCapturing(false);
    }
  };

  if (!permission) {
    return <View style={styles.center} />;
  }

  if (!permission.granted) {
    return (
      <View style={styles.center}>
        <Text style={styles.message}>We need camera access to photograph the label.</Text>
        <Button title="Grant camera permission" onPress={requestPermission} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <CameraView ref={cameraRef} style={StyleSheet.absoluteFill} facing="back" />
      <View style={styles.overlay} pointerEvents="box-none">
        <Text style={styles.hint}>Frame the ingredients label, then take a photo</Text>
        <View style={styles.actions}>
          {isCapturing ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Button title="Take photo" onPress={handleCapture} />
          )}
          <Button title="Cancel" onPress={onCancel} color="#999" />
        </View>
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
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingBottom: 40,
    gap: 16,
  },
  hint: {
    color: '#fff',
    fontSize: 16,
    textAlign: 'center',
    paddingHorizontal: 24,
  },
  actions: {
    gap: 12,
    width: '80%',
  },
});
