import { Ionicons } from '@expo/vector-icons';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { PillButton } from '../components/PillButton';
import { authenticateAppUnlock } from '../services/appLock';
import { useThemeColors } from '../theme/ThemeContext';
import type { ColorTheme } from '../theme/colors';
import { fonts } from '../theme/fonts';

interface Props {
  onUnlocked: () => void;
}

/** Full-screen cover shown whenever the app is locked — on cold start as
 * the only tree, and as an overlay on re-lock so native sheets keep their
 * presenting view. Prompts immediately on mount so the biometric sheet
 * appears without an extra tap, with a button as a fallback if that
 * prompt gets dismissed. */
export function AppLockScreen({ onUnlocked }: Props) {
  const { t } = useTranslation();
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [isAuthenticating, setIsAuthenticating] = useState(false);

  const handleUnlock = async () => {
    if (isAuthenticating) return;
    setIsAuthenticating(true);
    const success = await authenticateAppUnlock(t('settings.lockAppPrompt'));
    setIsAuthenticating(false);
    if (success) onUnlocked();
  };

  useEffect(() => {
    handleUnlock();
    // Only ever auto-prompt once per mount — re-tries are up to the button.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.center}>
        <View style={styles.iconWrap}>
          <Ionicons name="lock-closed" size={28} color={colors.mint} />
        </View>
        <Text style={styles.title}>{t('settings.lockAppTitle')}</Text>
        <Text style={styles.body}>{t('settings.lockAppBody')}</Text>
        <PillButton title={t('settings.lockAppUnlock')} onPress={handleUnlock} variant="punch" />
      </View>
    </SafeAreaView>
  );
}

function createStyles(colors: ColorTheme) {
  return StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: colors.cabinet,
    },
    center: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      padding: 28,
      gap: 12,
    },
    iconWrap: {
      width: 64,
      height: 64,
      borderRadius: 32,
      borderWidth: 2,
      borderColor: colors.mint,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 8,
    },
    title: {
      fontFamily: fonts.displayBold,
      fontSize: 19,
      color: colors.text,
      textAlign: 'center',
    },
    body: {
      fontSize: 13.5,
      lineHeight: 20,
      textAlign: 'center',
      color: colors.text,
      opacity: 0.65,
      maxWidth: 280,
      marginBottom: 8,
    },
  });
}
