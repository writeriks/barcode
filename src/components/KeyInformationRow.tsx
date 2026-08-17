import { Ionicons } from '@expo/vector-icons';
import type { KeyInformation, KeyInformationType } from 'expo-document-scanner';
import * as Clipboard from 'expo-clipboard';
import { useMemo } from 'react';
import { Linking, Pressable, ScrollView, StyleSheet, Text } from 'react-native';
import { captureAnalyticsEvent } from '../services/analytics';
import { useThemeColors } from '../theme/ThemeContext';
import { accentTextColor, type PillAccent } from '../theme/accents';
import type { ColorTheme } from '../theme/colors';
import { fonts } from '../theme/fonts';

const ICON: Record<KeyInformationType, keyof typeof Ionicons.glyphMap> = {
  phone: 'call-outline',
  email: 'mail-outline',
  link: 'link-outline',
  date: 'calendar-outline',
  address: 'location-outline',
};

const ACCENT: Record<KeyInformationType, PillAccent> = {
  phone: 'coral',
  email: 'citrus',
  link: 'mint',
  date: 'punch',
  address: 'mint',
};

/** What tapping a chip does. A date has nowhere useful to open to — the
 * calendar has no "show me this date" URL that works reliably — so it
 * copies instead, which is what someone reading a date off a scan wants
 * anyway. */
function actionUri(item: KeyInformation): string | null {
  switch (item.type) {
    case 'phone':
      return `tel:${item.value.replace(/[^\d+]/g, '')}`;
    case 'email':
      return `mailto:${item.value}`;
    case 'link':
      return /^[a-z][a-z\d+.-]*:/i.test(item.value) ? item.value : `https://${item.value}`;
    case 'address':
      return `http://maps.apple.com/?q=${encodeURIComponent(item.value)}`;
    case 'date':
      return null;
  }
}

interface Props {
  items: KeyInformation[];
  onCopied?: () => void;
}

/** The actionable details found in a page's text, as a scrolling row of
 * chips — call the number, mail the address, open the link, without
 * hunting for it in a wall of OCR output. */
export function KeyInformationRow({ items, onCopied }: Props) {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  if (items.length === 0) return null;

  const handlePress = async (item: KeyInformation) => {
    captureAnalyticsEvent('key_information_tapped', { type: item.type });
    const uri = actionUri(item);
    if (!uri) {
      await Clipboard.setStringAsync(item.value);
      onCopied?.();
      return;
    }
    // A detected value can still be something the OS has no handler for —
    // copying beats a tap that does nothing at all.
    if (await Linking.canOpenURL(uri)) {
      Linking.openURL(uri);
      return;
    }
    await Clipboard.setStringAsync(item.value);
    onCopied?.();
  };

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={styles.row}
      contentContainerStyle={styles.rowContent}
      keyboardShouldPersistTaps="handled"
    >
      {items.map((item) => {
        const tint = accentTextColor(colors, ACCENT[item.type]);
        return (
          <Pressable
            key={`${item.type}-${item.value}`}
            onPress={() => handlePress(item)}
            style={({ pressed }) => [styles.chip, { borderColor: tint }, pressed && styles.chipPressed]}
          >
            <Ionicons name={ICON[item.type]} size={13} color={tint} />
            <Text style={[styles.chipText, { color: tint }]} numberOfLines={1}>
              {item.value}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

function createStyles(colors: ColorTheme) {
  return StyleSheet.create({
    row: {
      flexGrow: 0,
    },
    rowContent: {
      gap: 8,
      paddingBottom: 10,
    },
    chip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      borderWidth: 1,
      borderRadius: 999,
      paddingHorizontal: 12,
      paddingVertical: 7,
      maxWidth: 220,
      backgroundColor: colors.panel,
    },
    chipPressed: {
      opacity: 0.7,
    },
    chipText: {
      fontFamily: fonts.displayBold,
      fontSize: 12.5,
    },
  });
}
