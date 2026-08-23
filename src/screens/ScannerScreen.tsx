import { Ionicons } from '@expo/vector-icons';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import { useIsFocused } from '@react-navigation/native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { BlurView } from 'expo-blur';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
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
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { PillButton } from '../components/PillButton';
import { usePremium } from '../premium/PremiumContext';
import { isExpoGo } from '../services/ads/environment';
import { consumeFreeScan, getRemainingFreeScans } from '../services/documentScanQuota';
import { playScanFeedback } from '../services/scanFeedback';
import { useThemeColors, useThemeMode } from '../theme/ThemeContext';
import type { ColorTheme } from '../theme/colors';
import { fonts } from '../theme/fonts';
import type { ScanKind, ScanMethod } from '../types/scan';

interface Props {
  onScanned: (data: string, kind: ScanKind, method: ScanMethod) => void;
  onDocumentScanned: (pageTexts: string[], imageUris: string[]) => void | Promise<void>;
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

// A conservative safety margin for any still-image decoder — doesn't
// hurt to give one more pixels per module on a small source image.
const MIN_SCAN_WIDTH = 1000;

async function prepareForScanning(uri: string, width: number): Promise<string> {
  if (width >= MIN_SCAN_WIDTH) return uri;
  const rendered = await ImageManipulator.manipulate(uri).resize({ width: MIN_SCAN_WIDTH }).renderAsync();
  const saved = await rendered.saveAsync({ format: SaveFormat.PNG });
  return saved.uri;
}

/**
 * expo-camera's `scanFromURLAsync` only looks for QR codes on iOS — its
 * native implementation calls `CIDetector(ofType: CIDetectorTypeQRCode)`
 * unconditionally and ignores the barcode-types argument entirely (see
 * node_modules/expo-camera/ios/CameraViewModule.swift). A photo of an
 * EAN-13/UPC/Code128/etc. barcode never gets found there, even though
 * the exact same code scans instantly from the live camera (which uses
 * AVFoundation, not CIDetector). Android's implementation is unaffected
 * — it already uses ML Kit and honors the full type list.
 *
 * modules/expo-barcode-vision is a local native module that fixes this
 * on iOS using Apple's Vision framework (VNDetectBarcodesRequest, every
 * symbology). It only exists once the app is rebuilt with it linked in
 * — never available under Expo Go — so it's tried first and only on
 * iOS, falling back to expo-camera's own scanner (which still covers
 * Android, and QR on iOS, correctly) whenever it's unavailable or finds
 * nothing.
 */
async function scanUploadedPhoto(uri: string): Promise<{ data: string; type: string }[]> {
  if (Platform.OS === 'ios' && !isExpoGo()) {
    try {
      const { scanFromURLAsync: scanWithVision } = await import('expo-barcode-vision');
      const visionMatches = await scanWithVision(uri);
      if (visionMatches.length > 0) return visionMatches;
    } catch {
      // Native module not linked in this build (e.g. still running an
      // older build before this was added) — fall through.
    }
  }
  return scanFromURLAsync(uri, [...SCANNED_TYPES]);
}

/**
 * Scans every barcode/QR format expo-camera supports natively (see
 * SCANNED_TYPES). `hasHandledScanRef` makes sure a single physical scan
 * only fires `onScanned` once, even though onBarcodeScanned keeps firing
 * for every frame the barcode stays in view — the parent is
 * expected to unmount this screen once it navigates away to look up the
 * result, which also stops the camera.
 */
export function ScannerScreen({ onScanned, onDocumentScanned, batchMode, batchCount = 0, onFinishBatch }: Props) {
  const { t } = useTranslation();
  const colors = useThemeColors();
  const mode = useThemeMode();
  const styles = useMemo(() => createStyles(colors, mode), [colors, mode]);
  const placeholderColor = mode === 'light' ? 'rgba(36,25,51,0.35)' : 'rgba(255,246,233,0.4)';
  const [permission, requestPermission] = useCameraPermissions();
  const hasHandledScanRef = useRef(false);
  const tabBarHeight = useBottomTabBarHeight();
  const insets = useSafeAreaInsets();
  // The Scanner tab stays mounted when another tab is active (that's how
  // react-navigation's bottom tabs work), so without this the camera would
  // keep scanning — and adding history entries — in the background.
  const isFocused = useIsFocused();

  const [isTorchOn, setIsTorchOn] = useState(false);
  const [isManualEntryOpen, setIsManualEntryOpen] = useState(false);
  const [manualValue, setManualValue] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [isScanningDocument, setIsScanningDocument] = useState(false);
  const { isPremium, openPaywall } = usePremium();
  // null until the keychain has been read — the badge stays hidden rather
  // than flashing a wrong number on the first frame.
  const [remainingFreeScans, setRemainingFreeScans] = useState<number | null>(null);

  // Re-read on focus so the badge is right after upgrading to premium in
  // Settings, or after a scan taken from somewhere else in the app.
  useEffect(() => {
    if (!isFocused || isPremium) return;
    getRemainingFreeScans().then(setRemainingFreeScans);
  }, [isFocused, isPremium]);

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
      if (!isFocused || hasHandledScanRef.current) return;
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
    [onScanned, batchMode, isFocused]
  );

  const handleUploadPhoto = useCallback(async () => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permissionResult.granted) return;

    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'] });
    if (result.canceled || !result.assets[0]) return;

    setIsUploading(true);
    try {
      const asset = result.assets[0];
      const scanUri = await prepareForScanning(asset.uri, asset.width);
      const matches = await scanUploadedPhoto(scanUri);
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

  // VisionKit's document camera + Vision's on-device OCR — both iOS-only
  // native APIs, same "never in Expo Go, always behind a dynamic import"
  // rule as scanUploadedPhoto's expo-barcode-vision module above.
  const handleScanDocument = useCallback(async () => {
    if (Platform.OS !== 'ios' || isExpoGo()) {
      Alert.alert(t('scanner.documentScanUnavailable'));
      return;
    }
    // Checked before the camera opens, not after: VisionKit's camera can't
    // be capped at N pages (its only delegate callback fires once the user
    // has already captured everything), so the free plan gates whole scans
    // instead — and a gate you hit *before* doing the work beats one that
    // takes your pages away afterwards.
    if (!isPremium && (await getRemainingFreeScans()) === 0) {
      openPaywall('documentScans');
      return;
    }
    setIsScanningDocument(true);
    try {
      const { scanDocumentAsync, recognizeTextAsync } = await import('expo-document-scanner');
      const pageUris = await scanDocumentAsync();
      // Backing out of the camera costs nothing — only a scan that actually
      // produced pages counts against the allowance.
      if (!pageUris || pageUris.length === 0) return;
      const pageTexts = await Promise.all(pageUris.map((uri) => recognizeTextAsync(uri)));
      if (!isPremium) setRemainingFreeScans(await consumeFreeScan());
      playScanFeedback();
      await onDocumentScanned(pageTexts, pageUris);
    } catch {
      Alert.alert(t('scanner.documentScanFailed'));
    } finally {
      setIsScanningDocument(false);
    }
  }, [onDocumentScanned, t, isPremium, openPaywall]);

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
      {isFocused ? (
        <CameraView
          style={StyleSheet.absoluteFill}
          facing="back"
          enableTorch={isTorchOn}
          barcodeScannerSettings={{ barcodeTypes: [...SCANNED_TYPES] }}
          onBarcodeScanned={handleBarcodeScanned}
        />
      ) : null}
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
          <ToolbarButton
            icon="document-text-outline"
            onPress={handleScanDocument}
            disabled={isScanningDocument}
            loading={isScanningDocument}
            badge={isPremium || remainingFreeScans === null ? undefined : remainingFreeScans}
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
  badge,
  colors,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
  active?: boolean;
  disabled?: boolean;
  loading?: boolean;
  /** Small count in the corner — how many free document scans are left.
   * Turns amber on the last one so running out isn't a surprise. */
  badge?: number;
  colors: ColorTheme;
}) {
  return (
    <Pressable onPress={onPress} disabled={disabled} style={toolbarButtonStyle.toolbarButton} hitSlop={8}>
      {loading ? (
        <ActivityIndicator size="small" color={colors.text} />
      ) : (
        <Ionicons name={icon} size={17} color={active ? colors.mint : colors.text} />
      )}
      {badge !== undefined && !loading ? (
        <View style={[toolbarButtonStyle.badge, { backgroundColor: badge <= 1 ? colors.citrus : colors.mint }]}>
          <Text style={[toolbarButtonStyle.badgeText, { color: colors.inkOnCream }]}>{badge}</Text>
        </View>
      ) : null}
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
  badge: {
    position: 'absolute',
    top: 2,
    right: '50%',
    marginRight: -20,
    minWidth: 14,
    height: 14,
    borderRadius: 7,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  badgeText: {
    fontFamily: fonts.displayBold,
    fontSize: 9,
    lineHeight: 12,
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
      width: '68%',
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
