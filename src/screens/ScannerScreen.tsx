import { Ionicons } from '@expo/vector-icons';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { BlurView } from 'expo-blur';
import * as ImagePicker from 'expo-image-picker';
import { scanFromURLAsync } from 'expo-camera';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Easing,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { PillButton } from '../components/PillButton';
import { playScanFeedback } from '../services/scanFeedback';
import { useThemeColors, useThemeMode } from '../theme/ThemeContext';
import type { ColorTheme } from '../theme/colors';
import { fonts } from '../theme/fonts';
import type { ScanKind, ScanMethod } from '../types/scan';

interface Props {
  onScanned: (data: string, kind: ScanKind, method: ScanMethod) => void;
  /** When set, the camera stays live after a scan instead of the parent
   * navigating away — used for scanning several codes back to back. */
  batchMode?: boolean;
  batchCount?: number;
  onFinishBatch?: () => void;
}

// How long to ignore new detections after a batch scan before re-arming —
// long enough that the same code (still in frame) isn't immediately
// re-scanned, short enough that consecutive different codes feel fluid.
const BATCH_SCAN_COOLDOWN_MS = 1200;

const SCANNED_TYPES = [
  'qr',
  'aztec',
  'codabar',
  'code39',
  'code93',
  'code128',
  'datamatrix',
  'ean8',
  'ean13',
  'itf14',
  'pdf417',
  'upc_a',
  'upc_e',
] as const;
const VIEWFINDER_HEIGHT = 130;

/**
 * Scans every barcode/QR format expo-camera supports natively (see
 * SCANNED_TYPES). `hasHandledScanRef` makes sure a single physical scan
 * only fires `onScanned` once, even though onBarcodeScanned keeps firing
 * for every frame the barcode stays in view — the parent is
 * expected to unmount this screen once it navigates away to look up the
 * result, which also stops the camera.
 */
export function ScannerScreen({ onScanned, batchMode, batchCount = 0, onFinishBatch }: Props) {
  const { t } = useTranslation();
  const colors = useThemeColors();
  const mode = useThemeMode();
  const styles = useMemo(() => createStyles(colors, mode), [colors, mode]);
  const placeholderColor = mode === 'light' ? 'rgba(36,25,51,0.35)' : 'rgba(255,246,233,0.4)';
  const [permission, requestPermission] = useCameraPermissions();
  const hasHandledScanRef = useRef(false);
  const tabBarHeight = useBottomTabBarHeight();
  const insets = useSafeAreaInsets();

  const [isTorchOn, setIsTorchOn] = useState(false);
  const [isManualEntryOpen, setIsManualEntryOpen] = useState(false);
  const [manualValue, setManualValue] = useState('');
  const [isUploading, setIsUploading] = useState(false);

  const pulse = useRef(new Animated.Value(0)).current;
  const sweep = useRef(new Animated.Value(0)).current;
  const signal = useRef(new Animated.Value(0)).current;

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
    const signalLoop = Animated.loop(
      Animated.timing(signal, { toValue: 1, duration: 1400, easing: Easing.out(Easing.ease), useNativeDriver: true })
    );
    pulseLoop.start();
    sweepLoop.start();
    signalLoop.start();
    return () => {
      pulseLoop.stop();
      sweepLoop.stop();
      signalLoop.stop();
    };
  }, [pulse, sweep, signal]);

  const handleBarcodeScanned = useCallback(
    ({ data, type }: { data: string; type: string }) => {
      if (hasHandledScanRef.current) return;
      hasHandledScanRef.current = true;
      playScanFeedback();
      onScanned(data, type === 'qr' ? 'qr' : 'barcode', 'camera');

      // In batch mode nothing unmounts this screen to naturally reset the
      // lock, so re-arm it ourselves after a short cooldown.
      if (batchMode) {
        setTimeout(() => {
          hasHandledScanRef.current = false;
        }, BATCH_SCAN_COOLDOWN_MS);
      }
    },
    [onScanned, batchMode]
  );

  const handleUploadPhoto = useCallback(async () => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permissionResult.granted) return;

    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'] });
    if (result.canceled || !result.assets[0]) return;

    setIsUploading(true);
    try {
      const matches = await scanFromURLAsync(result.assets[0].uri, [...SCANNED_TYPES]);
      if (matches.length > 0 && !hasHandledScanRef.current) {
        hasHandledScanRef.current = true;
        playScanFeedback();
        onScanned(matches[0].data, matches[0].type === 'qr' ? 'qr' : 'barcode', 'photo');
      } else {
        Alert.alert(t('scanner.noBarcodeFound'));
      }
    } finally {
      setIsUploading(false);
    }
  }, [onScanned, t]);

  const handleManualSubmit = useCallback(() => {
    const trimmed = manualValue.trim();
    if (!trimmed || hasHandledScanRef.current) return;
    hasHandledScanRef.current = true;
    setIsManualEntryOpen(false);
    onScanned(trimmed, 'barcode', 'manual');
  }, [manualValue, onScanned]);

  if (!permission) {
    return <View style={styles.center} />;
  }

  if (!permission.granted) {
    return (
      <View style={styles.center}>
        <Text style={styles.message}>{t('scanner.cameraPermissionMessage')}</Text>
        <PillButton title={t('scanner.grantPermission')} onPress={requestPermission} variant="citrus" />
      </View>
    );
  }

  const borderColor = pulse.interpolate({ inputRange: [0, 1], outputRange: [colors.punch, colors.mint] });
  const sweepTranslate = sweep.interpolate({ inputRange: [0, 1], outputRange: [8, VIEWFINDER_HEIGHT - 8] });
  const sweepOpacity = sweep.interpolate({ inputRange: [0, 0.12, 0.5, 0.62, 1], outputRange: [0, 1, 1, 0, 0] });
  const signalScale = signal.interpolate({ inputRange: [0, 1], outputRange: [1, 2.4] });
  const signalOpacity = signal.interpolate({ inputRange: [0, 0.15, 1], outputRange: [0.6, 0.45, 0] });

  return (
    <View style={styles.container}>
      <CameraView
        style={StyleSheet.absoluteFill}
        facing="back"
        enableTorch={isTorchOn}
        barcodeScannerSettings={{ barcodeTypes: [...SCANNED_TYPES] }}
        onBarcodeScanned={handleBarcodeScanned}
      />
      <View style={styles.overlay} pointerEvents="none">
        <Animated.View style={[styles.viewfinder, { borderColor }]}>
          <Animated.View
            style={[styles.scanline, { transform: [{ translateY: sweepTranslate }], opacity: sweepOpacity }]}
          />
        </Animated.View>
        <Text style={styles.title}>{t('scanner.title')}</Text>
        <View style={styles.chip}>
          <View style={styles.signalWrap}>
            <Animated.View
              style={[styles.signalRing, { transform: [{ scale: signalScale }], opacity: signalOpacity }]}
            />
            <View style={styles.dot} />
          </View>
          <Text style={styles.chipLabel}>{t('scanner.waitingToScan')}</Text>
        </View>
      </View>

      {batchMode ? (
        <View style={[styles.batchBarWrap, { top: insets.top + 16 }]} pointerEvents="box-none">
          <BlurView intensity={68} tint={mode === 'light' ? 'light' : 'dark'} style={styles.batchBar}>
            <Text style={styles.batchCount}>{t('scanner.batchCount', { count: batchCount })}</Text>
            <Pressable onPress={onFinishBatch} style={styles.batchDoneButton} hitSlop={8}>
              <Text style={styles.batchDoneText}>{t('scanner.batchDone')}</Text>
            </Pressable>
          </BlurView>
        </View>
      ) : null}

      <View style={[styles.toolbarWrap, { bottom: tabBarHeight + 30 }]}>
        <BlurView intensity={68} tint={mode === 'light' ? 'light' : 'dark'} style={styles.toolbar}>
          <ToolbarButton
            icon="image-outline"
            onPress={handleUploadPhoto}
            disabled={isUploading}
            loading={isUploading}
            colors={colors}
          />
          <View style={styles.toolbarDivider} />
          <ToolbarButton icon="barcode-outline" onPress={() => setIsManualEntryOpen(true)} colors={colors} />
          <View style={styles.toolbarDivider} />
          <ToolbarButton
            icon={isTorchOn ? 'flash' : 'flash-outline'}
            active={isTorchOn}
            onPress={() => setIsTorchOn((prev) => !prev)}
            colors={colors}
          />
        </BlurView>
      </View>

      <Modal visible={isManualEntryOpen} transparent animationType="fade" onRequestClose={() => setIsManualEntryOpen(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>{t('scanner.manualEntry')}</Text>
            <TextInput
              style={styles.modalInput}
              placeholder={t('scanner.manualEntryPlaceholder')}
              placeholderTextColor={placeholderColor}
              keyboardType="number-pad"
              value={manualValue}
              onChangeText={setManualValue}
              autoFocus
            />
            <View style={styles.modalActions}>
              <PillButton
                title={t('scanner.cancel')}
                onPress={() => {
                  setIsManualEntryOpen(false);
                  setManualValue('');
                }}
                variant="ghost"
              />
              <PillButton title={t('scanner.manualEntrySubmit')} onPress={handleManualSubmit} variant="citrus" />
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function ToolbarButton({
  icon,
  onPress,
  active,
  disabled,
  loading,
  colors,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
  active?: boolean;
  disabled?: boolean;
  loading?: boolean;
  colors: ColorTheme;
}) {
  return (
    <Pressable onPress={onPress} disabled={disabled} style={toolbarButtonStyle.toolbarButton} hitSlop={8}>
      {loading ? (
        <ActivityIndicator size="small" color={colors.text} />
      ) : (
        <Ionicons name={icon} size={17} color={active ? colors.mint : colors.text} />
      )}
    </Pressable>
  );
}

const toolbarButtonStyle = StyleSheet.create({
  toolbarButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 9,
  },
});

function createStyles(colors: ColorTheme, mode: 'light' | 'dark') {
  const hairline = mode === 'light' ? 'rgba(36,25,51,0.12)' : 'rgba(255,255,255,0.14)';

  return StyleSheet.create({
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
      color: colors.text,
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
      color: colors.text,
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
    signalWrap: {
      width: 10,
      height: 10,
      alignItems: 'center',
      justifyContent: 'center',
    },
    signalRing: {
      position: 'absolute',
      width: 10,
      height: 10,
      borderRadius: 5,
      backgroundColor: colors.mint,
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
      color: colors.text,
      opacity: 0.85,
    },
    batchBarWrap: {
      position: 'absolute',
      left: 24,
      right: 24,
      alignItems: 'center',
    },
    batchBar: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      borderRadius: 999,
      overflow: 'hidden',
      borderWidth: 1,
      borderColor: hairline,
      paddingLeft: 16,
      paddingRight: 6,
      paddingVertical: 6,
    },
    batchCount: {
      fontFamily: fonts.displayBold,
      fontSize: 13,
      color: colors.text,
    },
    batchDoneButton: {
      backgroundColor: colors.mint,
      borderRadius: 999,
      paddingHorizontal: 16,
      paddingVertical: 8,
    },
    batchDoneText: {
      fontFamily: fonts.displayBold,
      fontSize: 12.5,
      color: colors.inkOnCream,
    },
    toolbarWrap: {
      position: 'absolute',
      left: 24,
      right: 24,
      alignItems: 'center',
    },
    toolbar: {
      flexDirection: 'row',
      alignItems: 'center',
      width: '50%',
      borderRadius: 18,
      overflow: 'hidden',
      borderWidth: 1,
      borderColor: hairline,
    },
    toolbarDivider: {
      width: 1,
      height: 16,
      backgroundColor: hairline,
    },
    modalBackdrop: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.55)',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 28,
    },
    modalCard: {
      width: '100%',
      backgroundColor: colors.panel,
      borderWidth: 1,
      borderColor: colors.panelLine,
      borderRadius: 20,
      padding: 20,
      gap: 14,
    },
    modalTitle: {
      fontFamily: fonts.displayBold,
      fontSize: 16,
      color: colors.text,
    },
    modalInput: {
      backgroundColor: colors.cabinet,
      borderWidth: 1,
      borderColor: colors.panelLine,
      borderRadius: 14,
      paddingHorizontal: 16,
      paddingVertical: 12,
      color: colors.text,
      fontSize: 15,
    },
    modalActions: {
      flexDirection: 'row',
      justifyContent: 'flex-end',
      gap: 12,
    },
  });
}
