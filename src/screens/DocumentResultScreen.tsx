import { Ionicons } from '@expo/vector-icons';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import * as Clipboard from 'expo-clipboard';
import * as Sharing from 'expo-sharing';
import * as Speech from 'expo-speech';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Alert,
  Image,
  Modal,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
  type NativeSyntheticEvent,
  type NativeScrollEvent,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BottomBannerAd } from '../components/BottomBannerAd';
import { PillButton } from '../components/PillButton';
import { captureAnalyticsEvent } from '../services/analytics';
import { useThemeColors } from '../theme/ThemeContext';
import type { ColorTheme } from '../theme/colors';
import { fonts } from '../theme/fonts';
import { resolveSpeechLanguage } from '../utils/speechLanguage';

interface Props {
  /** pageTexts[i] is the OCR text for imageUris[i] — the card shows
   * whichever page the pager is currently on, so swiping to another page
   * swaps in that page's own text. */
  pageTexts: string[];
  imageUris: string[];
  onScanAgain: () => void;
  onDelete: () => void;
}

// content's horizontal padding (20 on each side) — subtracted from the
// window width so the page pager fills exactly what's between them.
const CONTENT_PADDING = 20;
const PAGE_HEIGHT = 380;
// Selection checkbox icon (22) + sectionRow's gap (10).
const SELECTION_COLUMN_WIDTH = 32;

/** Shows a scanned document's pages and the text Vision's OCR recognized
 * in them — used both right after a fresh Scan Document capture and when
 * reopening a saved document from History, same as QrResultScreen/
 * FoundProductScreen. */
export function DocumentResultScreen({ pageTexts, imageUris, onScanAgain, onDelete }: Props) {
  const { t, i18n } = useTranslation();
  const tabBarHeight = useBottomTabBarHeight();
  const insets = useSafeAreaInsets();
  const { width: windowWidth } = useWindowDimensions();
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [activePage, setActivePage] = useState(0);
  const [isFullscreenOpen, setIsFullscreenOpen] = useState(false);
  const [isSelecting, setIsSelecting] = useState(false);
  // The pager loses width to the selection checkbox's column (icon + the
  // row's gap) while selecting, so it doesn't overflow past the screen.
  const pageWidth = windowWidth - CONTENT_PADDING * 2 - (isSelecting ? SELECTION_COLUMN_WIDTH : 0);
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors, windowWidth, pageWidth), [colors, windowWidth, pageWidth]);
  const [selectedDocument, setSelectedDocument] = useState(true);
  const [selectedText, setSelectedText] = useState(true);
  const fullscreenScrollRef = useRef<ScrollView>(null);
  const hasImages = imageUris.length > 0;
  // Every action (read aloud, copy, share, save) acts on whichever page is
  // currently in view — swipe the pager and the text card, and everything
  // below it, follows.
  const text = pageTexts[activePage] ?? '';
  const hasText = text.trim().length > 0;

  // Reading aloud shouldn't keep going once this screen isn't visible
  // anymore (navigating away, "Scan again", etc), or once the visible
  // page — and therefore the text being read — has changed under it.
  useEffect(() => {
    return () => {
      Speech.stop();
    };
  }, [activePage]);

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
    Alert.alert(t('qr.copied'));
  };

  const handleOpenFullscreen = () => {
    if (!hasImages) return;
    setIsFullscreenOpen(true);
    // The modal mounts the pager fresh each time — jump it to the page
    // that was showing in the main pager, without an animated scroll.
    requestAnimationFrame(() => {
      fullscreenScrollRef.current?.scrollTo({ x: activePage * windowWidth, animated: false });
    });
  };

  const handlePagerScrollEnd = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    setActivePage(Math.round(event.nativeEvent.contentOffset.x / pageWidth));
  };

  const handleFullscreenScrollEnd = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    setActivePage(Math.round(event.nativeEvent.contentOffset.x / windowWidth));
  };

  const handleStartEditSelection = () => {
    setSelectedDocument(hasImages);
    setSelectedText(hasText);
    setIsSelecting(true);
  };

  const handleCancelShareSelection = () => setIsSelecting(false);

  const handleConfirmShare = async () => {
    if (!selectedDocument && !selectedText) return;
    setIsSelecting(false);
    captureAnalyticsEvent('document_action', {
      action: 'share',
      target: selectedDocument && selectedText ? 'both' : selectedDocument ? 'image' : 'text',
    });

    if (selectedDocument && selectedText) {
      // Combining an attached file with a text message in one native share
      // sheet is an iOS-only capability of Share.share's {message, url} —
      // the app's other native work (barcode/document scanning) is
      // already iOS-only for the same reason, so this matches.
      await Share.share({ message: text, url: imageUris[activePage] });
      return;
    }
    if (selectedDocument) {
      if (await Sharing.isAvailableAsync()) await Sharing.shareAsync(imageUris[activePage]);
      return;
    }
    await Share.share({ message: text });
  };

  // The native share sheet is also how iOS lets a photo be saved — "Save
  // Image" (Photos) and "Save to Files" both show up on it for free for
  // an image attachment, so this reuses the same expo-sharing call as
  // handleConfirmShare's document-only branch rather than needing a
  // separate media-library permission/module just for this button.
  const handleSaveToDevice = async () => {
    if (!hasImages) return;
    captureAnalyticsEvent('document_action', { action: 'save' });
    if (await Sharing.isAvailableAsync()) await Sharing.shareAsync(imageUris[activePage]);
  };

  const handleDeletePress = () => {
    Alert.alert(t('history.deleteEntryTitle'), t('history.deleteEntryBody'), [
      { text: t('history.cancel'), style: 'cancel' },
      { text: t('history.delete'), style: 'destructive', onPress: onDelete },
    ]);
  };

  return (
    <View style={[styles.screen, { paddingBottom: tabBarHeight }]}>
      <ScrollView contentContainerStyle={styles.content}>
        {hasImages ? (
          <View style={styles.sectionRow}>
            {isSelecting ? (
              <SelectionCheckbox checked={selectedDocument} colors={colors} onPress={() => setSelectedDocument((v) => !v)} />
            ) : null}
            <View style={styles.pagerWrap}>
              <ScrollView
                style={styles.pager}
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                onMomentumScrollEnd={handlePagerScrollEnd}
                contentContainerStyle={styles.pagerContent}
              >
                {imageUris.map((uri) => (
                  <Pressable
                    key={uri}
                    style={styles.pageBox}
                    onPress={() => (isSelecting ? setSelectedDocument((v) => !v) : handleOpenFullscreen())}
                  >
                    <Image source={{ uri }} style={styles.pageImage} resizeMode="contain" />
                    {!isSelecting ? (
                      <View style={styles.expandHint}>
                        <Ionicons name="expand-outline" size={14} color={colors.cream} />
                      </View>
                    ) : null}
                  </Pressable>
                ))}
              </ScrollView>
              {imageUris.length > 1 ? (
                <View style={styles.dotsRow}>
                  {imageUris.map((uri, index) => (
                    <View key={uri} style={[styles.dot, index === activePage && styles.dotActive]} />
                  ))}
                </View>
              ) : null}
            </View>
          </View>
        ) : null}

        <View style={styles.sectionRow}>
          {isSelecting && hasText ? (
            <SelectionCheckbox checked={selectedText} colors={colors} onPress={() => setSelectedText((v) => !v)} />
          ) : null}
          <Pressable
            style={styles.card}
            onPress={() => (isSelecting ? hasText && setSelectedText((v) => !v) : hasText && handleCopy())}
          >
            <View style={styles.cardHeader}>
              <View style={styles.cardHeaderTitles}>
                <Text style={styles.sectionTitle}>{t('document.extractedText')}</Text>
                {imageUris.length > 1 ? (
                  <Text style={styles.cardSubtitle}>
                    {t('document.pageOf', { current: activePage + 1, total: imageUris.length })}
                  </Text>
                ) : null}
              </View>
              {hasText && !isSelecting ? (
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
          </Pressable>
        </View>

        {isSelecting ? (
          <View style={styles.actionRow}>
            <PillButton
              title={t('scanner.cancel')}
              onPress={handleCancelShareSelection}
              variant="ghost"
              style={styles.flexButton}
            />
            <PillButton
              title={t('qr.share')}
              onPress={handleConfirmShare}
              variant="punch"
              style={[styles.flexButton, !(selectedDocument || selectedText) && styles.disabledButton]}
            />
          </View>
        ) : (
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
              icon="create-outline"
              tint={colors.mint}
              onPress={handleStartEditSelection}
              accessibilityLabel={t('history.edit')}
              colors={colors}
            />
            <IconActionButton
              icon="trash-outline"
              tint={colors.coralText}
              onPress={handleDeletePress}
              accessibilityLabel={t('document.delete')}
              colors={colors}
            />
            <IconActionButton
              icon="camera-outline"
              tint={colors.punch}
              filled
              onPress={onScanAgain}
              accessibilityLabel={t('document.scanAnother')}
              colors={colors}
            />
          </View>
        )}
      </ScrollView>
      <BottomBannerAd />

      <Modal visible={isFullscreenOpen} animationType="fade" onRequestClose={() => setIsFullscreenOpen(false)}>
        <View style={styles.fullscreenScreen}>
          <ScrollView
            ref={fullscreenScrollRef}
            style={styles.fullscreenScrollView}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onMomentumScrollEnd={handleFullscreenScrollEnd}
          >
            {imageUris.map((uri) => (
              <View key={uri} style={styles.fullscreenPage}>
                <Image source={{ uri }} style={styles.fullscreenImage} resizeMode="contain" />
              </View>
            ))}
          </ScrollView>
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
          {imageUris.length > 1 ? (
            <Text style={[styles.fullscreenPageCount, { bottom: insets.bottom + 20 }]}>
              {t('document.pageOf', { current: activePage + 1, total: imageUris.length })}
            </Text>
          ) : null}
        </View>
      </Modal>
    </View>
  );
}

function SelectionCheckbox({
  checked,
  onPress,
  colors,
}: {
  checked: boolean;
  onPress: () => void;
  colors: ColorTheme;
}) {
  return (
    <Pressable onPress={onPress} hitSlop={10} style={{ paddingTop: 2 }}>
      <Ionicons
        name={checked ? 'checkmark-circle' : 'ellipse-outline'}
        size={22}
        color={checked ? colors.mint : colors.text}
        style={!checked && { opacity: 0.4 }}
      />
    </Pressable>
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

function createStyles(colors: ColorTheme, windowWidth: number, pageWidth: number) {
  return StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: colors.cabinet,
    },
    content: {
      padding: 20,
      gap: 14,
      paddingBottom: 40,
    },
    sectionRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 10,
    },
    pagerWrap: {
      alignItems: 'center',
      gap: 10,
    },
    pager: {
      width: pageWidth,
    },
    pagerContent: {
      alignItems: 'center',
    },
    pageBox: {
      width: pageWidth,
      height: PAGE_HEIGHT,
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
    dotsRow: {
      flexDirection: 'row',
      gap: 6,
    },
    dot: {
      width: 6,
      height: 6,
      borderRadius: 3,
      backgroundColor: colors.panelLine,
    },
    dotActive: {
      backgroundColor: colors.mint,
      width: 16,
    },
    card: {
      flex: 1,
      backgroundColor: colors.panel,
      borderWidth: 1,
      borderColor: colors.panelLine,
      borderRadius: 20,
      padding: 16,
      gap: 10,
    },
    cardHeader: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
    },
    cardHeaderTitles: {
      gap: 2,
    },
    copyIcon: {
      opacity: 0.55,
    },
    sectionTitle: {
      fontFamily: fonts.displayBold,
      fontSize: 14,
      color: colors.text,
    },
    cardSubtitle: {
      fontFamily: fonts.mono,
      fontSize: 10,
      letterSpacing: 0.4,
      color: colors.text,
      opacity: 0.5,
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
    actionRow: {
      flexDirection: 'row',
      gap: 10,
    },
    iconRow: {
      flexDirection: 'row',
      justifyContent: 'center',
      gap: 18,
      paddingVertical: 2,
    },
    flexButton: {
      flex: 1,
    },
    disabledButton: {
      opacity: 0.4,
    },
    fullscreenScreen: {
      flex: 1,
      backgroundColor: '#000',
    },
    fullscreenScrollView: {
      flex: 1,
    },
    fullscreenPage: {
      width: windowWidth,
      flex: 1,
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
    fullscreenPageCount: {
      position: 'absolute',
      alignSelf: 'center',
      fontFamily: fonts.mono,
      fontSize: 11,
      letterSpacing: 0.5,
      color: 'rgba(255,255,255,0.85)',
    },
  });
}
