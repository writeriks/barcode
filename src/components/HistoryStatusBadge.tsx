import { StyleSheet, Text, View } from 'react-native';
import { colors } from '../theme/colors';
import { fonts } from '../theme/fonts';
import type { ScanHistoryStatus } from '../types/history';

const GRADE_COLORS: Record<string, string> = {
  a: colors.mint,
  b: colors.mint,
  c: colors.citrus,
  d: colors.coral,
  e: colors.coral,
};

interface Props {
  status: ScanHistoryStatus;
  grade?: string;
}

export function HistoryStatusBadge({ status, grade }: Props) {
  const normalizedGrade = grade?.toLowerCase();
  if (status === 'found' && normalizedGrade && GRADE_COLORS[normalizedGrade]) {
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
