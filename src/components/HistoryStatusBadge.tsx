import { Ionicons } from '@expo/vector-icons';
import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useThemeColors } from '../theme/ThemeContext';
import type { ColorTheme } from '../theme/colors';
import { fonts } from '../theme/fonts';
import type { ScanHistoryEntry } from '../types/history';
import type { QrContentType } from '../utils/classifyQrContent';

function gradeColor(colors: ColorTheme, grade: string): string | undefined {
  switch (grade) {
    case 'a':
    case 'b':
      return colors.mintText;
    case 'c':
      return colors.citrusText;
    case 'd':
    case 'e':
      return colors.coralText;
    default:
      return undefined;
  }
}

const QR_TYPE_ICON: Record<QrContentType, keyof typeof Ionicons.glyphMap> = {
  link: 'link-outline',
  email: 'mail-outline',
  phone: 'call-outline',
  otp: 'key-outline',
  text: 'document-text-outline',
};

function qrTypeColor(colors: ColorTheme, type: QrContentType): string {
  switch (type) {
    case 'link':
    case 'email':
    case 'phone':
      return colors.mintText;
    case 'otp':
      return colors.punch;
    case 'text':
      return colors.citrusText;
  }
}

interface Props {
  entry: ScanHistoryEntry;
}

export function HistoryStatusBadge({ entry }: Props) {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  if (entry.kind === 'qr') {
    const color = qrTypeColor(colors, entry.contentType);
    return (
      <View style={[styles.badge, { borderColor: color }]}>
        <Ionicons name={QR_TYPE_ICON[entry.contentType]} size={14} color={color} />
      </View>
    );
  }

  const normalizedGrade = entry.product?.nutriscoreGrade?.toLowerCase();
  const color = normalizedGrade ? gradeColor(colors, normalizedGrade) : undefined;
  if (entry.status === 'found' && color) {
    return (
      <View style={[styles.badge, { borderColor: color }]}>
        <Text style={[styles.text, { color }]}>{normalizedGrade!.toUpperCase()}</Text>
      </View>
    );
  }
  return (
    <View style={[styles.badge, styles.neutral]}>
      <Text style={[styles.text, styles.neutralText]}>?</Text>
    </View>
  );
}

function createStyles(colors: ColorTheme) {
  return StyleSheet.create({
    badge: {
      width: 32,
      height: 32,
      borderRadius: 16,
      borderWidth: 2,
      alignItems: 'center',
      justifyContent: 'center',
    },
    neutral: {
      borderColor: colors.panelLine,
    },
    text: {
      fontFamily: fonts.displayBold,
      fontSize: 14,
    },
    neutralText: {
      color: colors.text,
      opacity: 0.4,
    },
  });
}
