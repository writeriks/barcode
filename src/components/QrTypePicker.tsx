import { Ionicons } from '@expo/vector-icons';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, StyleSheet, Text } from 'react-native';
import { useThemeColors } from '../theme/ThemeContext';
import type { ColorTheme } from '../theme/colors';
import type { QrContentType } from '../utils/classifyQrContent';
import { QR_TYPE_ICON, QR_TYPE_LABEL_KEY } from '../utils/qrTypeMeta';
import { fonts } from '../theme/fonts';

/** Only the types the generator actually has a form for — 'otp' is
 * scan-only (you don't hand-author a 2FA secret), and more of these will
 * join the list as their forms get designed. */
const GENERATE_TYPES: QrContentType[] = [
  'link',
  'text',
  'email',
  'phone',
  'sms',
  'whatsapp',
  'zoom',
  'wifi',
  'vcard',
  'event',
];

interface Props {
  value: QrContentType;
  onChange: (type: QrContentType) => void;
}

export function QrTypePicker({ value, onChange }: Props) {
  const { t } = useTranslation();
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
      {GENERATE_TYPES.map((type) => {
        const selected = value === type;
        return (
          <Pressable
            key={type}
            onPress={() => onChange(type)}
            style={[styles.pill, selected && styles.pillSelected]}
          >
            <Ionicons name={QR_TYPE_ICON[type]} size={15} color={selected ? colors.cream : colors.text} />
            <Text style={[styles.label, selected && styles.labelSelected]}>{t(QR_TYPE_LABEL_KEY[type])}</Text>
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
  });
}
