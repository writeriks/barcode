import { Ionicons } from '@expo/vector-icons';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { PillButton } from '../components/PillButton';
import { APP_NAME } from '../config/appInfo';
import { useThemeColors } from '../theme/ThemeContext';
import { accentTextColor, type PillAccent } from '../theme/accents';
import type { ColorTheme } from '../theme/colors';
import { fonts } from '../theme/fonts';

const POINTS: { icon: keyof typeof Ionicons.glyphMap; accent: PillAccent; titleKey: string; bodyKey: string }[] = [
  {
    icon: 'scan-outline',
    accent: 'mint',
    titleKey: 'onboarding.scanTitle',
    bodyKey: 'onboarding.scanBody',
  },
  {
    icon: 'document-text-outline',
    accent: 'citrus',
    titleKey: 'onboarding.documentTitle',
    bodyKey: 'onboarding.documentBody',
  },
  {
    icon: 'lock-closed-outline',
    accent: 'coral',
    titleKey: 'onboarding.privacyTitle',
    bodyKey: 'onboarding.privacyBody',
  },
];

interface Props {
  onDone: () => void;
}

/**
 * Shown once, on the very first launch.
 *
 * It also buys the app a place to explain itself before iOS's tracking
 * prompt appears: ad setup is deliberately held until this is dismissed
 * (see App.tsx), so the system dialog arrives after the user knows what
 * the app is, rather than over a screen they haven't read yet — which is
 * both the order Apple recommends and the one that gets a yes.
 */
export function OnboardingScreen({ onDone }: Props) {
  const { t } = useTranslation();
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.badge}>
          <Ionicons name="qr-code" size={30} color={colors.mint} />
        </View>
        <Text style={styles.title}>{t('onboarding.title', { app: APP_NAME })}</Text>
        <Text style={styles.subtitle}>{t('onboarding.subtitle')}</Text>

        <View style={styles.points}>
          {POINTS.map((point) => {
            const tint = accentTextColor(colors, point.accent);
            return (
              <View key={point.titleKey} style={styles.point}>
                <View style={[styles.pointIcon, { borderColor: tint }]}>
                  <Ionicons name={point.icon} size={19} color={tint} />
                </View>
                <View style={styles.pointText}>
                  <Text style={styles.pointTitle}>{t(point.titleKey)}</Text>
                  <Text style={styles.pointBody}>{t(point.bodyKey)}</Text>
                </View>
              </View>
            );
          })}
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <PillButton title={t('onboarding.start')} onPress={onDone} variant="punch" />
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
    content: {
      flexGrow: 1,
      justifyContent: 'center',
      padding: 28,
      gap: 10,
    },
    badge: {
      alignSelf: 'center',
      width: 62,
      height: 62,
      borderRadius: 20,
      backgroundColor: colors.panel,
      borderWidth: 1,
      borderColor: colors.panelLine,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 8,
    },
    title: {
      fontFamily: fonts.displayBold,
      fontSize: 25,
      textAlign: 'center',
      color: colors.text,
    },
    subtitle: {
      fontSize: 14,
      lineHeight: 20,
      textAlign: 'center',
      color: colors.text,
      opacity: 0.65,
      marginBottom: 18,
    },
    points: {
      gap: 16,
    },
    point: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 14,
    },
    pointIcon: {
      width: 42,
      height: 42,
      borderRadius: 14,
      borderWidth: 1.5,
      alignItems: 'center',
      justifyContent: 'center',
    },
    pointText: {
      flex: 1,
      paddingTop: 2,
    },
    pointTitle: {
      fontFamily: fonts.displayBold,
      fontSize: 15,
      color: colors.text,
    },
    pointBody: {
      fontSize: 13,
      lineHeight: 19,
      color: colors.text,
      opacity: 0.65,
      marginTop: 3,
    },
    footer: {
      paddingHorizontal: 28,
      paddingBottom: 20,
      paddingTop: 8,
    },
  });
}
