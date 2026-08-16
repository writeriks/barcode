import { Ionicons } from '@expo/vector-icons';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import * as Clipboard from 'expo-clipboard';
import * as Speech from 'expo-speech';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, Image, Modal, Pressable, ScrollView, Share, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BottomBannerAd } from '../components/BottomBannerAd';
import { captureAnalyticsEvent } from '../services/analytics';
import { useThemeColors } from '../theme/ThemeContext';
import type { ColorTheme } from '../theme/colors';
import { fonts } from '../theme/fonts';
import { resolveSpeechLanguage } from '../utils/speechLanguage';

interface Props {
  imageUri: string | null;
  text: string;
  onDelete: () => void;
  /** Set only for a page opened from the multi-page Gallery — shows a
   * back chevron to it. A standalone page has nothing above it here, so
   * it leaves via the navigator or the tab bar. */
  onBack?: () => void;
  onCopied?: () => void;
}

// How long after the share sheet resolves to keep ignoring taps on the
// page. Covers the dismissal animation, which outlives the promise.
const SHARE_DISMISS_GRACE_MS = 500;

/** A single scanned page: its image and the text Vision's OCR recognized
 * in it. Used both as the sole screen for a one-page document and, nested
 * under DocumentGalleryScreen, for one page of a multi-page document. */
export function DocumentResultScreen({ imageUri, text, onDelete, onBack, onCopied }: Props) {
  const { t, i18n } = useTranslation();
  const tabBarHeight = useBottomTabBarHeight();
  const insets = useSafeAreaInsets();
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isFullscreenOpen, setIsFullscreenOpen] = useState(false);
  const [didImageFail, setDidImageFail] = useState(false);
  // True from opening the share sheet until well past its dismissal — see
  // shareImage for why the gap after matters.
  const isSharePendingRef = useRef(false);
  const hasText = text.trim().length > 0;

  // A page whose file can't be read used to render as an empty box here
  // and a black rectangle in the viewer, which says nothing about what
  // went wrong — and the share button silently had nothing to send. Say
  // it on screen, and put the path in the log so it can be checked.
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
   * scan" means. The text has its own affordance, the copy button above.
   *
   * The share sheet is also how iOS offers to save: "Save Image" and
   * "Save to Files" both appear on it for an image, which is why the
   * fullscreen viewer's save button lands here too.
   */
  const shareImage = async (action: 'share' | 'save') => {
    if (!imageUri || isSharePendingRef.current) return;
    captureAnalyticsEvent('document_action', { action });
    isSharePendingRef.current = true;
    try {
      await Share.share({ url: imageUri });
    } catch {
      // Anything that goes wrong here used to surface as the button
      // simply not reacting, which reads as a broken app rather than a
      // failure. Say so instead.
      Alert.alert(t('document.shareFailed'));
    } finally {
      // The sheet's dismissal animation outlives the promise, and the tap
      // that dismissed it lands on the page underneath — which sits on a
      // Pressable that opens the fullscreen viewer. Presenting that while
      // the sheet is still going away wedges both, and the screen stops
      // responding entirely. Hold the guard past the animation. Same race
      // as the deferred Share.share calls in HistoryScreen and
      // MyCodesScreen, in the other direction.
      setTimeout(() => {
        isSharePendingRef.current = false;
      }, SHARE_DISMISS_GRACE_MS);
    }
  };

  const handleOpenFullscreen = () => {
    if (didImageFail || isSharePendingRef.current) return;
    setIsFullscreenOpen(true);
  };

  const handleShare = () => shareImage('share');
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
      <ScrollView contentContainerStyle={styles.content}>
        {imageUri ? (
          <Pressable
            style={styles.pageBox}
            onPress={handleOpenFullscreen}
            disabled={didImageFail}
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
        ) : null}

        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.sectionTitle}>{t('document.extractedText')}</Text>
            {hasText ? (
              <Pressable onPress={handleCopy} hitSlop={8}>
                <Ionicons name="copy-outline" size={15} color={colors.text} style={styles.copyIcon} />
              </Pressable>
            ) : null}
          </View>
          {hasText ? (
            <Text style={styles.bodyText}>{text}</Text>
          ) : (
            <Text style={styles.emptyText}>{t('document.noTextFound')}</Text>
          )}
        </View>

        <View style={styles.iconRow}>
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
      </ScrollView>
      <BottomBannerAd />

      {imageUri ? (
        <Modal visible={isFullscreenOpen} animationType="fade" onRequestClose={() => setIsFullscreenOpen(false)}>
          <View style={styles.fullscreenScreen}>
            <Image source={{ uri: imageUri }} style={styles.fullscreenImage} resizeMode="contain" />
            <Pressable
              onPress={handleSaveToDevice}
              hitSlop={10}
              style={[styles.fullscreenSave, { top: insets.top + 12 }]}
            >
              <Ionicons name="download-outline" size={20} color={colors.cream} />
            </Pressable>
            <Pressable
              onPress={() => setIsFullscreenOpen(false)}
              hitSlop={10}
              style={[styles.fullscreenClose, { top: insets.top + 12 }]}
            >
              <Ionicons name="close" size={22} color={colors.cream} />
            </Pressable>
          </View>
        </Modal>
      ) : null}
    </View>
  );
}

function IconActionButton({
  icon,
  tint,
  filled,
  disabled,
  onPress,
  accessibilityLabel,
  colors,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  tint: string;
  filled?: boolean;
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
      style={[
        iconButtonStyle.base,
        filled
          ? { backgroundColor: tint }
          : { backgroundColor: colors.panel, borderWidth: 1, borderColor: colors.panelLine },
        disabled && iconButtonStyle.disabled,
      ]}
    >
      <Ionicons name={icon} size={19} color={filled ? colors.cream : tint} />
    </Pressable>
  );
}

const iconButtonStyle = StyleSheet.create({
  base: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  disabled: {
    opacity: 0.35,
  },
});

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
    content: {
      padding: 20,
      gap: 14,
      paddingBottom: 40,
    },
    pageBox: {
      width: '100%',
      height: 380,
      alignItems: 'center',
      justifyContent: 'center',
    },
    pageImage: {
      width: '100%',
      height: '100%',
      borderRadius: 16,
      backgroundColor: colors.cream,
      borderWidth: 2,
      borderColor: colors.mint,
    },
    expandHint: {
      position: 'absolute',
      right: 10,
      bottom: 10,
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
    card: {
      backgroundColor: colors.panel,
      borderWidth: 1,
      borderColor: colors.panelLine,
      borderRadius: 20,
      padding: 16,
      gap: 10,
    },
    cardHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    copyIcon: {
      opacity: 0.55,
    },
    sectionTitle: {
      fontFamily: fonts.displayBold,
      fontSize: 14,
      color: colors.text,
    },
    bodyText: {
      fontSize: 14,
      lineHeight: 21,
      color: colors.text,
    },
    emptyText: {
      fontSize: 13.5,
      color: colors.text,
      opacity: 0.55,
    },
    iconRow: {
      flexDirection: 'row',
      justifyContent: 'center',
      gap: 18,
      paddingVertical: 2,
    },
    fullscreenScreen: {
      flex: 1,
      backgroundColor: '#000',
      alignItems: 'center',
      justifyContent: 'center',
    },
    fullscreenImage: {
      width: '100%',
      height: '100%',
    },
    fullscreenClose: {
      position: 'absolute',
      right: 16,
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
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: 'rgba(255,255,255,0.15)',
      alignItems: 'center',
      justifyContent: 'center',
    },
  });
}
