import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, Text, View } from 'react-native';
import { PillButton } from '../components/PillButton';
import { colors } from '../theme/colors';
import { fonts } from '../theme/fonts';

interface Props {
  /** Raw technical error (network/HTTP/parse failure) — logged for
   * debugging only, never shown to the user. The UI always shows a
   * translated generic message instead. */
  message: string;
  onRetry: () => void;
  onScanAgain: () => void;
}

export function LookupErrorScreen({ message, onRetry, onScanAgain }: Props) {
  const { t } = useTranslation();

  useEffect(() => {
    console.warn('[lookupProduct] error:', message);
  }, [message]);

  return (
    <View style={styles.container}>
      <View style={styles.badge}>
        <Text style={styles.badgeText}>!</Text>
      </View>
      <Text style={styles.title}>{t('error.title')}</Text>
      <Text style={styles.body}>{t('error.genericMessage')}</Text>
      <View style={styles.actions}>
        <PillButton title={t('error.retry')} onPress={onRetry} variant="punch" />
        <PillButton title={t('error.scanAnother')} onPress={onScanAgain} variant="ghost" />
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
