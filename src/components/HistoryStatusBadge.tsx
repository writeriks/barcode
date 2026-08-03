import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';
import { colors } from '../theme/colors';
import { fonts } from '../theme/fonts';
import type { ScanHistoryEntry } from '../types/history';
import type { QrContentType } from '../utils/classifyQrContent';

const GRADE_COLORS: Record<string, string> = {
  a: colors.mint,
  b: colors.mint,
  c: colors.citrus,
  d: colors.coral,
  e: colors.coral,
};

const QR_TYPE_ICON: Record<QrContentType, keyof typeof Ionicons.glyphMap> = {
  link: 'link-outline',
  email: 'mail-outline',
  phone: 'call-outline',
  text: 'document-text-outline',
};

const QR_TYPE_COLOR: Record<QrContentType, string> = {
  link: colors.mint,
  email: colors.mint,
  phone: colors.mint,
  text: colors.citrus,
};

interface Props {
  entry: ScanHistoryEntry;
}

export function HistoryStatusBadge({ entry }: Props) {
  if (entry.kind === 'qr') {
    const color = QR_TYPE_COLOR[entry.contentType];
    return (
      <View style={[styles.badge, { borderColor: color }]}>
        <Ionicons name={QR_TYPE_ICON[entry.contentType]} size={14} color={color} />
      </View>
    );
  }

  const normalizedGrade = entry.product?.nutriscoreGrade?.toLowerCase();
  if (entry.status === 'found' && normalizedGrade && GRADE_COLORS[normalizedGrade]) {
    const color = GRADE_COLORS[normalizedGrade];
    return (
      <View style={[styles.badge, { borderColor: color }]}>
        <Text style={[styles.text, { color }]}>{normalizedGrade.toUpperCase()}</Text>
      </View>
    );
  }
  return (
    <View style={[styles.badge, styles.neutral]}>
      <Text style={[styles.text, styles.neutralText]}>?</Text>
    </View>
  );
}

const styles = StyleSheet.create({
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
    color: colors.cream,
    opacity: 0.4,
  },
});
