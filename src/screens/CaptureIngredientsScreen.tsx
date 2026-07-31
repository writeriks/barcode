import { CameraView, useCameraPermissions } from 'expo-camera';
import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { PillButton } from '../components/PillButton';
import { submitIngredientsPhoto } from '../services/submitIngredientsPhoto';
import { colors } from '../theme/colors';
import { fonts } from '../theme/fonts';

interface Props {
  barcode: string;
  onDone: () => void;
  onCancel: () => void;
}

export function CaptureIngredientsScreen({ barcode, onDone, onCancel }: Props) {
  const { t } = useTranslation();
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
        <Text style={styles.message}>{t('capture.cameraPermissionMessage')}</Text>
        <PillButton title={t('capture.grantPermission')} onPress={requestPermission} variant="citrus" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <CameraView ref={cameraRef} style={StyleSheet.absoluteFill} facing="back" />
      <View style={styles.frame} pointerEvents="none" />
      <View style={styles.overlay} pointerEvents="box-none">
        <Text style={styles.hint}>{t('capture.hint')}</Text>
        <View style={styles.actions}>
          {isCapturing ? (
            <ActivityIndicator color={colors.mint} />
          ) : (
            <PillButton title={t('capture.takePhoto')} onPress={handleCapture} variant="citrus" />
          )}
          <PillButton title={t('capture.cancel')} onPress={onCancel} variant="ghost" />
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
  frame: {
    position: 'absolute',
    top: '18%',
    left: '8%',
    right: '8%',
    bottom: '32%',
    borderWidth: 2,
    borderColor: colors.mint,
    borderRadius: 18,
  },
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingBottom: 40,
    gap: 16,
  },
  hint: {
    fontFamily: fonts.displayBold,
    color: colors.cream,
    fontSize: 15,
    textAlign: 'center',
    paddingHorizontal: 24,
  },
  actions: {
    gap: 12,
    alignItems: 'center',
    width: '80%',
  },
});
