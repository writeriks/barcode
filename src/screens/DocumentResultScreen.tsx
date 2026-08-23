import { Ionicons } from '@expo/vector-icons';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import * as Clipboard from 'expo-clipboard';
import * as Speech from 'expo-speech';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, Image, Modal, Pressable, ScrollView, Share, StyleSheet, Text, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BottomBannerAd } from '../components/BottomBannerAd';
import { ZoomableImage } from '../components/ZoomableImage';
import { KeyInformationRow } from '../components/KeyInformationRow';
import { ShareFormatSheet, type ShareFormat } from '../components/ShareFormatSheet';
import { captureAnalyticsEvent } from '../services/analytics';
import { useKeyInformation } from '../hooks/useKeyInformation';
import { shareDocument } from '../services/documentShare';
import { useThemeColors } from '../theme/ThemeContext';
import type { ColorTheme } from '../theme/colors';
import { fonts } from '../theme/fonts';
import { resolveSpeechLanguage } from '../utils/speechLanguage';

interface Props {
  imageUri: string | null;
  text: string;
  /** The name the user gave this document, if they renamed it. Without one
   * the header falls back to naming the kind of thing it is. */
  label?: string;
  /** When it was scanned, and where this page sits in the document — the
   * things the History list showed and this screen used to drop. */
  timestamp: number;
  pageCount: number;
  pageIndex: number;
  onDelete: () => void;
  /** Set only for a page opened from the multi-page Gallery — shows a
   * back chevron to it. A standalone page has nothing above it here, so
   * it leaves via the navigator or the tab bar. */
  onBack?: () => void;
  onCopied?: () => void;
}

type Tab = 'page' | 'text';

// How long after the share sheet resolves to keep ignoring taps on the
// page. Covers the dismissal animation, which outlives the promise.
const SHARE_DISMISS_GRACE_MS = 500;

/** A single scanned page. The page and its recognized text each get the
 * whole screen, switched between rather than stacked: we don't know yet
 * whether people open a scan to look at it or to use the text out of it,
 * and splitting the height between them served neither — it left the
 * bottom third empty and the text in a box too short to read.
 *
 * Used both as the sole screen for a one-page document and, nested under
 * DocumentGalleryScreen, for one page of a multi-page one. */
export function DocumentResultScreen({
  imageUri,
  text,
  label,
  timestamp,
  pageCount,
  pageIndex,
  onDelete,
  onBack,
  onCopied,
}: Props) {
  const { t, i18n } = useTranslation();
  const tabBarHeight = useBottomTabBarHeight();
  const insets = useSafeAreaInsets();
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [tab, setTab] = useState<Tab>('page');
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isFullscreenOpen, setIsFullscreenOpen] = useState(false);
  const [didImageFail, setDidImageFail] = useState(false);
  const [isShareSheetOpen, setIsShareSheetOpen] = useState(false);
  // True from opening the share sheet until well past its dismissal — see
  // shareImage for why the gap after matters.
  const isSharePendingRef = useRef(false);
  const hasText = text.trim().length > 0;
  const keyInformation = useKeyInformation(text);

  const scannedAt = new Date(timestamp).toLocaleString(i18n.language, {
    dateStyle: 'medium',
    timeStyle: 'short',
  });

  // A page whose file can't be read used to render as an empty box and a
  // black fullscreen viewer, which says nothing about what went wrong.
  // Say it on screen, and put the path in the log so it can be checked.
  const handleImageError = (message: string) => {
    console.warn(`[Blippo] scanned page failed to load: ${imageUri} — ${message}`);
    setDidImageFail(true);
  };

  // A new page replaces a failed one when the gallery moves between pages.
  useEffect(() => {
    setDidImageFail(false);
  }, [imageUri]);

  // Reading aloud shouldn't keep going once this screen isn't visible anymore.
  useEffect(() => {
    return () => {
      Speech.stop();
    };
  }, []);

  const handleToggleReadAloud = () => {
    if (!hasText) return;
    if (isSpeaking) {
      Speech.stop();
      setIsSpeaking(false);
      return;
    }
    captureAnalyticsEvent('document_action', { action: 'read_aloud' });
    setIsSpeaking(true);
    Speech.speak(text, {
      language: resolveSpeechLanguage(i18n.language),
      onDone: () => setIsSpeaking(false),
      onStopped: () => setIsSpeaking(false),
      onError: () => setIsSpeaking(false),
    });
  };

  const handleCopy = async () => {
    captureAnalyticsEvent('document_action', { action: 'copy' });
    await Clipboard.setStringAsync(text);
    onCopied?.();
  };

  /**
   * Opens the share sheet on a scanned page.
   *
   * Shares the page itself, never its OCR text — this is a document, and
   * sending someone a wall of recognized characters isn't what "share a
   * scan" means. The text has its own affordance, the copy button.
   *
   * The share sheet is also how iOS offers to save: "Save Image" and
   * "Save to Files" both appear on it for an image, which is why the
   * fullscreen viewer's save button lands here too.
   */
  const shareImage = async (action: 'share' | 'save', format: ShareFormat = 'image') => {
    if (!imageUri || isSharePendingRef.current) return;
    captureAnalyticsEvent('document_action', { action, format });
    isSharePendingRef.current = true;
    try {
      if (format === 'pdf') await shareDocument([imageUri], label ?? t('document.typeDocument'), 'pdf');
      else await Share.share({ url: imageUri });
    } catch {
      Alert.alert(t(format === 'pdf' ? 'document.pdfFailed' : 'document.shareFailed'));
    } finally {
      // The sheet's dismissal animation outlives the promise, and the tap
      // that dismissed it lands on the page underneath — which opens the
      // fullscreen viewer. Presenting that while the sheet is still going
      // away wedges both, and the screen stops responding entirely.
      setTimeout(() => {
        isSharePendingRef.current = false;
      }, SHARE_DISMISS_GRACE_MS);
    }
  };

  const handleOpenFullscreen = () => {
    if (didImageFail || isSharePendingRef.current) return;
    setIsFullscreenOpen(true);
  };

  // The format question comes first; the fullscreen viewer's save button
  // skips it, because "save this picture" has already answered it.
  const handleShare = () => setIsShareSheetOpen(true);
  const handleSaveToDevice = () => shareImage('save');

  const handleDeletePress = () => {
    Alert.alert(t('history.deleteEntryTitle'), t('history.deleteEntryBody'), [
      { text: t('history.cancel'), style: 'cancel' },
      { text: t('history.delete'), style: 'destructive', onPress: onDelete },
    ]);
  };

  return (
    <View style={[styles.screen, { paddingBottom: tabBarHeight }]}>
      {onBack ? (
        <Pressable onPress={onBack} hitSlop={10} style={styles.backRow}>
          <Ionicons name="chevron-back" size={18} color={colors.text} />
          <Text style={styles.backLabel}>{t('document.backToGallery')}</Text>
        </Pressable>
      ) : null}

      <View style={styles.header}>
        <Text style={styles.title} numberOfLines={2}>
          {label || t('document.typeDocument')}
        </Text>
        <Text style={styles.meta}>
          {pageCount > 1
            ? `${scannedAt} · ${t('document.pagePosition', { page: pageIndex + 1, total: pageCount })}`
            : scannedAt}
        </Text>
      </View>

      <View style={styles.segment}>
        <SegmentButton
          label={t('document.tabPage')}
          selected={tab === 'page'}
          onPress={() => setTab('page')}
          styles={styles}
        />
        <SegmentButton
          label={t('document.tabText')}
          selected={tab === 'text'}
          onPress={() => setTab('text')}
          styles={styles}
        />
      </View>

      {/* Whichever tab is showing gets the whole remaining height, and the
          actions float over the bottom of it. Deliberately inside this
          box rather than over the screen: an absolutely-positioned bar
          measured from the screen's bottom lands on the ad below, which
          AdMob counts as obscuring an impression. */}
      <View style={styles.stage}>
        {tab === 'page' ? (
          imageUri ? (
            <Pressable
              style={styles.pageFill}
              onPress={handleOpenFullscreen}
              disabled={didImageFail}
              accessibilityLabel={t('a11y.viewFullScreen')}
            >
              <Image
                source={{ uri: imageUri }}
                style={styles.pageImage}
                resizeMode="contain"
                onError={(event) => handleImageError(event.nativeEvent.error)}
              />
              {didImageFail ? (
                <View style={styles.pageErrorOverlay}>
                  <Ionicons name="alert-circle-outline" size={26} color={colors.coralText} />
                  <Text style={styles.pageErrorText}>{t('document.pageMissing')}</Text>
                </View>
              ) : (
                <View style={styles.expandHint}>
                  <Ionicons name="expand-outline" size={14} color={colors.cream} />
                </View>
              )}
            </Pressable>
          ) : (
            <View style={styles.emptyStage}>
              <Text style={styles.emptyText}>{t('document.pageMissing')}</Text>
            </View>
          )
        ) : (
          <View style={styles.textColumn}>
            {/* Above the text box rather than inside it: the copy button
                floats over that box's top-right corner, and a scrolling
                row of chips would slide underneath it. */}
            {hasText ? <KeyInformationRow items={keyInformation} onCopied={onCopied} /> : null}
            <View style={styles.textStage}>
              {hasText ? (
                <>
                  <Pressable
                    onPress={handleCopy}
                    hitSlop={8}
                    accessibilityLabel={t('a11y.copyText')}
                    style={styles.copyButton}
                  >
                    <Ionicons name="copy-outline" size={16} color={colors.text} style={styles.copyIcon} />
                  </Pressable>
                  <ScrollView
                    style={styles.textScroll}
                    contentContainerStyle={styles.textContent}
                    showsVerticalScrollIndicator
                  >
                    <Text style={styles.bodyText} selectable>
                      {text}
                    </Text>
                  </ScrollView>
                </>
              ) : (
                <View style={styles.emptyStage}>
                  <Text style={styles.emptyText}>{t('document.noTextFound')}</Text>
                </View>
              )}
            </View>
          </View>
        )}

        <View style={styles.actionBar} pointerEvents="box-none">
          <IconActionButton
            icon={isSpeaking ? 'stop-circle-outline' : 'volume-high-outline'}
            tint={colors.mint}
            disabled={!hasText}
            onPress={handleToggleReadAloud}
            accessibilityLabel={t(isSpeaking ? 'document.stopReading' : 'document.readAloud')}
            colors={colors}
          />
          <IconActionButton
            icon="share-outline"
            tint={colors.citrusText}
            disabled={!imageUri}
            onPress={handleShare}
            accessibilityLabel={t('qr.share')}
            colors={colors}
          />
          <IconActionButton
            icon="trash-outline"
            tint={colors.coralText}
            onPress={handleDeletePress}
            accessibilityLabel={t('document.delete')}
            colors={colors}
          />
        </View>
      </View>

      <BottomBannerAd />

      <ShareFormatSheet
        visible={isShareSheetOpen}
        pageCount={1}
        onClose={() => setIsShareSheetOpen(false)}
        onSelect={(format) => shareImage('share', format)}
      />

      {imageUri ? (
        <Modal visible={isFullscreenOpen} animationType="fade" onRequestClose={() => setIsFullscreenOpen(false)}>
          {/* A Modal sits outside the app's root gesture handler, so pinch
              wouldn't fire without its own root. Remounting the image when
              the viewer opens also resets zoom from the last visit. */}
          <GestureHandlerRootView style={styles.fullscreenScreen}>
            {isFullscreenOpen ? <ZoomableImage uri={imageUri} /> : null}
            <Pressable
              onPress={handleSaveToDevice}
              hitSlop={10}
              accessibilityLabel={t('a11y.save')}
              style={[styles.fullscreenSave, { top: insets.top + 12 }]}
            >
              <Ionicons name="download-outline" size={20} color={colors.cream} />
            </Pressable>
            <Pressable
              onPress={() => setIsFullscreenOpen(false)}
              hitSlop={10}
              accessibilityLabel={t('a11y.close')}
              style={[styles.fullscreenClose, { top: insets.top + 12 }]}
            >
              <Ionicons name="close" size={22} color={colors.cream} />
            </Pressable>
          </GestureHandlerRootView>
        </Modal>
      ) : null}
    </View>
  );
}

type Styles = ReturnType<typeof createStyles>;

function SegmentButton({
  label,
  selected,
  onPress,
  styles,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
  styles: Styles;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.segmentButton, selected && styles.segmentButtonSelected]}
      accessibilityRole="tab"
      accessibilityState={{ selected }}
    >
      <Text style={[styles.segmentLabel, selected && styles.segmentLabelSelected]}>{label}</Text>
    </Pressable>
  );
}

function IconActionButton({
  icon,
  tint,
  disabled,
  onPress,
  accessibilityLabel,
  colors,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  tint: string;
  disabled?: boolean;
  onPress: () => void;
  accessibilityLabel: string;
  colors: ColorTheme;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      hitSlop={6}
      accessibilityLabel={accessibilityLabel}
      style={({ pressed }) => [
        iconButtonStyle.base,
        { backgroundColor: colors.panel, borderColor: colors.panelLine },
        disabled && iconButtonStyle.disabled,
        pressed && iconButtonStyle.pressed,
      ]}
    >
      <Ionicons name={icon} size={19} color={tint} />
    </Pressable>
  );
}

const iconButtonStyle = StyleSheet.create({
  base: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  disabled: {
    opacity: 0.35,
  },
  pressed: {
    opacity: 0.7,
  },
});

// Enough clearance under the floating actions that the last line of text
// or the bottom of the page isn't sitting behind them.
const ACTION_BAR_CLEARANCE = 74;

function createStyles(colors: ColorTheme) {
  return StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: colors.cabinet,
    },
    backRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 2,
      paddingHorizontal: 16,
      paddingTop: 12,
    },
    backLabel: {
      fontFamily: fonts.displayBold,
      fontSize: 14,
      color: colors.text,
    },
    header: {
      paddingHorizontal: 20,
      paddingTop: 14,
      paddingBottom: 12,
      gap: 3,
    },
    title: {
      fontFamily: fonts.displayBold,
      fontSize: 19,
      lineHeight: 24,
      color: colors.text,
    },
    meta: {
      fontFamily: fonts.mono,
      fontSize: 10.5,
      color: colors.text,
      opacity: 0.5,
    },
    segment: {
      flexDirection: 'row',
      gap: 3,
      marginHorizontal: 20,
      padding: 3,
      backgroundColor: colors.panel,
      borderWidth: 1,
      borderColor: colors.panelLine,
      borderRadius: 13,
    },
    segmentButton: {
      flex: 1,
      alignItems: 'center',
      paddingVertical: 8,
      borderRadius: 10,
    },
    segmentButtonSelected: {
      backgroundColor: colors.punch,
    },
    segmentLabel: {
      fontFamily: fonts.displayBold,
      fontSize: 12.5,
      color: colors.text,
      opacity: 0.6,
    },
    segmentLabelSelected: {
      color: colors.cream,
      opacity: 1,
    },
    stage: {
      flex: 1,
      marginHorizontal: 20,
      marginTop: 12,
      marginBottom: 14,
    },
    pageFill: {
      flex: 1,
      borderRadius: 16,
      overflow: 'hidden',
      backgroundColor: colors.cream,
      borderWidth: 1,
      borderColor: colors.panelLine,
    },
    pageImage: {
      width: '100%',
      height: '100%',
    },
    expandHint: {
      position: 'absolute',
      right: 10,
      top: 10,
      backgroundColor: 'rgba(0,0,0,0.45)',
      borderRadius: 999,
      padding: 6,
    },
    pageErrorOverlay: {
      ...StyleSheet.absoluteFillObject,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      padding: 20,
    },
    pageErrorText: {
      fontSize: 13,
      lineHeight: 19,
      textAlign: 'center',
      color: colors.inkOnCream,
    },
    textColumn: {
      flex: 1,
    },
    textStage: {
      flex: 1,
      backgroundColor: colors.panel,
      borderWidth: 1,
      borderColor: colors.panelLine,
      borderRadius: 16,
      overflow: 'hidden',
    },
    textScroll: {
      flex: 1,
    },
    textContent: {
      padding: 16,
      paddingRight: 46,
      paddingBottom: ACTION_BAR_CLEARANCE,
    },
    copyButton: {
      position: 'absolute',
      top: 12,
      right: 12,
      zIndex: 1,
      padding: 4,
    },
    copyIcon: {
      opacity: 0.55,
    },
    bodyText: {
      fontSize: 14.5,
      lineHeight: 22,
      color: colors.text,
    },
    emptyStage: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      padding: 24,
      backgroundColor: colors.panel,
      borderWidth: 1,
      borderColor: colors.panelLine,
      borderRadius: 16,
    },
    emptyText: {
      fontSize: 13.5,
      textAlign: 'center',
      color: colors.text,
      opacity: 0.55,
    },
    actionBar: {
      position: 'absolute',
      left: 0,
      right: 0,
      bottom: 14,
      flexDirection: 'row',
      justifyContent: 'center',
      gap: 18,
    },
    fullscreenScreen: {
      flex: 1,
      backgroundColor: '#000',
    },
    fullscreenClose: {
      position: 'absolute',
      right: 16,
      zIndex: 2,
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: 'rgba(255,255,255,0.15)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    fullscreenSave: {
      position: 'absolute',
      left: 16,
      zIndex: 2,
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: 'rgba(255,255,255,0.15)',
      alignItems: 'center',
      justifyContent: 'center',
    },
  });
}
