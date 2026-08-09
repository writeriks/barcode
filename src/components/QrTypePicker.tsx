import { Ionicons } from '@expo/vector-icons';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, StyleSheet, Text } from 'react-native';
import { usePremium } from '../premium/PremiumContext';
import { useThemeColors } from '../theme/ThemeContext';
import type { ColorTheme } from '../theme/colors';
import type { QrContentType } from '../utils/classifyQrContent';
import { QR_GENERATE_TYPES, QR_PREMIUM_TYPES, QR_TYPE_ICON, QR_TYPE_LABEL_KEY } from '../utils/qrTypeMeta';
import { fonts } from '../theme/fonts';

interface Props {
  value: QrContentType;
  onChange: (type: QrContentType) => void;
}

/** A locked pill opens the paywall instead of switching the form to that
 * type — same pattern as Settings' premium-gated toggles. */
export function QrTypePicker({ value, onChange }: Props) {
  const { t } = useTranslation();
  const colors = useThemeColors();
  const { isPremium, openPaywall } = usePremium();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
      {QR_GENERATE_TYPES.map((type) => {
        const selected = value === type;
        const locked = QR_PREMIUM_TYPES.has(type) && !isPremium;
        return (
          <Pressable
            key={type}
            onPress={() => (locked ? openPaywall() : onChange(type))}
            style={[styles.pill, selected && styles.pillSelected]}
          >
            <Ionicons name={QR_TYPE_ICON[type]} size={15} color={selected ? colors.cream : colors.text} />
            <Text style={[styles.label, selected && styles.labelSelected]}>{t(QR_TYPE_LABEL_KEY[type])}</Text>
            {locked ? (
              <Ionicons
                name="lock-closed"
                size={11}
                color={selected ? colors.cream : colors.text}
                style={styles.lockIcon}
              />
            ) : null}
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

function createStyles(colors: ColorTheme) {
  return StyleSheet.create({
    row: {
      flexDirection: 'row',
      gap: 8,
      paddingVertical: 2,
      paddingRight: 4,
    },
    pill: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      backgroundColor: colors.panel,
      borderWidth: 1,
      borderColor: colors.panelLine,
      borderRadius: 999,
      paddingHorizontal: 14,
      paddingVertical: 9,
    },
    pillSelected: {
      backgroundColor: colors.punch,
      borderColor: colors.punch,
    },
    label: {
      fontFamily: fonts.displayBold,
      fontSize: 13,
      color: colors.text,
      opacity: 0.75,
    },
    labelSelected: {
      color: colors.cream,
      opacity: 1,
    },
    lockIcon: {
      opacity: 0.7,
    },
  });
}
