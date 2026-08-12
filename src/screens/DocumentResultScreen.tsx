import { Ionicons } from '@expo/vector-icons';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import * as Clipboard from 'expo-clipboard';
import * as Speech from 'expo-speech';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, Image, Pressable, ScrollView, Share, StyleSheet, Text, View } from 'react-native';
import { BottomBannerAd } from '../components/BottomBannerAd';
import { PillButton } from '../components/PillButton';
import { captureAnalyticsEvent } from '../services/analytics';
import { useThemeColors } from '../theme/ThemeContext';
import type { ColorTheme } from '../theme/colors';
import { fonts } from '../theme/fonts';
import { resolveSpeechLanguage } from '../utils/speechLanguage';

interface Props {
  text: string;
  imageUris: string[];
  onScanAgain: () => void;
}

/** Shows a scanned document's pages and the text Vision's OCR recognized
 * in them — used both right after a fresh Scan Document capture and when
 * reopening a saved document from History, same as QrResultScreen/
 * FoundProductScreen. */
export function DocumentResultScreen({ text, imageUris, onScanAgain }: Props) {
  const { t, i18n } = useTranslation();
  const tabBarHeight = useBottomTabBarHeight();
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const hasText = text.trim().length > 0;

  // Reading aloud shouldn't keep going once this screen isn't visible
  // anymore (navigating away, "Scan again", etc).
  useEffect(() => {
    return () => {
      Speech.stop();
    };
  }, []);

  const handleToggleReadAloud = () => {
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

  const handleShare = () => {
    captureAnalyticsEvent('document_action', { action: 'share' });
    Share.share({ message: text });
  };

  return (
    <View style={[styles.screen, { paddingBottom: tabBarHeight }]}>
      <ScrollView contentContainerStyle={styles.content}>
        {imageUris.length > 0 ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.pageRow}>
            {imageUris.map((uri, index) => (
              <View key={uri} style={styles.pageThumbWrap}>
                <Image source={{ uri }} style={styles.pageThumb} resizeMode="cover" />
                {imageUris.length > 1 ? (
                  <Text style={styles.pageNumber}>{t('document.pageNumber', { number: index + 1 })}</Text>
                ) : null}
              </View>
            ))}
          </ScrollView>
        ) : null}

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>{t('document.extractedText')}</Text>
          {hasText ? (
            <Pressable onPress={handleCopy} style={({ pressed }) => pressed && styles.textPressed}>
              <Text style={styles.bodyText}>{text}</Text>
            </Pressable>
          ) : (
            <Text style={styles.emptyText}>{t('document.noTextFound')}</Text>
          )}
        </View>

        {hasText ? (
          <View style={styles.actions}>
            <PillButton
              title={t(isSpeaking ? 'document.stopReading' : 'document.readAloud')}
              onPress={handleToggleReadAloud}
              variant="citrus"
              icon={isSpeaking ? 'stop-circle-outline' : 'volume-high-outline'}
            />
            <View style={styles.actionRow}>
              <PillButton title={t('qr.copy')} onPress={handleCopy} variant="ghost" style={styles.flexButton} />
              <PillButton title={t('qr.share')} onPress={handleShare} variant="ghost" style={styles.flexButton} />
            </View>
          </View>
        ) : null}

        <PillButton title={t('document.scanAnother')} onPress={onScanAgain} variant="punch" />
      </ScrollView>
      <BottomBannerAd />
    </View>
  );
}

function createStyles(colors: ColorTheme) {
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
    pageRow: {
      gap: 10,
      paddingBottom: 2,
    },
    pageThumbWrap: {
      alignItems: 'center',
      gap: 6,
    },
    pageThumb: {
      width: 110,
      height: 150,
      borderRadius: 12,
      backgroundColor: colors.cream,
      borderWidth: 2,
      borderColor: colors.mint,
    },
    pageNumber: {
      fontFamily: fonts.mono,
      fontSize: 10,
      letterSpacing: 0.5,
      color: colors.text,
      opacity: 0.55,
    },
    card: {
      backgroundColor: colors.panel,
      borderWidth: 1,
      borderColor: colors.panelLine,
      borderRadius: 20,
      padding: 16,
      gap: 10,
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
    textPressed: {
      opacity: 0.7,
    },
    emptyText: {
      fontSize: 13.5,
      color: colors.text,
      opacity: 0.55,
    },
    actions: {
      gap: 10,
    },
    actionRow: {
      flexDirection: 'row',
      gap: 10,
    },
    flexButton: {
      flex: 1,
    },
  });
}
