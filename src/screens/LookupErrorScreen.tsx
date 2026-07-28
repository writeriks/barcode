import { StyleSheet, Text, View } from 'react-native';
import { PillButton } from '../components/PillButton';
import { colors } from '../theme/colors';
import { fonts } from '../theme/fonts';

interface Props {
  message: string;
  onRetry: () => void;
  onScanAgain: () => void;
}

export function LookupErrorScreen({ message, onRetry, onScanAgain }: Props) {
  return (
    <View style={styles.container}>
      <View style={styles.badge}>
        <Text style={styles.badgeText}>!</Text>
      </View>
      <Text style={styles.title}>Lookup failed</Text>
      <Text style={styles.body}>{message}</Text>
      <View style={styles.actions}>
        <PillButton title="Retry" onPress={onRetry} variant="punch" />
        <PillButton title="Scan another product" onPress={onScanAgain} variant="ghost" />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 28,
    gap: 12,
    backgroundColor: colors.cabinet,
  },
  badge: {
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: 2,
    borderColor: colors.coral,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  badgeText: {
    fontFamily: fonts.displayBold,
    fontSize: 22,
    color: colors.coral,
  },
  title: {
    fontFamily: fonts.displayBold,
    fontSize: 19,
    color: colors.cream,
  },
  body: {
    fontSize: 13.5,
    lineHeight: 20,
    textAlign: 'center',
    color: colors.cream,
    opacity: 0.7,
    maxWidth: 280,
  },
  actions: {
    marginTop: 16,
    gap: 12,
    alignItems: 'center',
  },
});
