import { Ionicons } from '@expo/vector-icons';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { PillButton } from '../components/PillButton';
import { useThemeColors } from '../theme/ThemeContext';
import type { ColorTheme } from '../theme/colors';
import { fonts } from '../theme/fonts';

interface Props {
  visible: boolean;
  onClose: () => void;
  onUnlock: () => void;
}

const BENEFITS: { icon: keyof typeof Ionicons.glyphMap; labelKey: string }[] = [
  { icon: 'ban-outline', labelKey: 'paywall.benefitNoAds' },
  { icon: 'infinite-outline', labelKey: 'paywall.benefitHistory' },
  { icon: 'options-outline', labelKey: 'paywall.benefitSettings' },
];

/** The upgrade pitch, shown whenever a free user taps a premium-gated
 * toggle or hits the free history limit. There's no real purchase flow
 * yet (see premiumPreference.ts) — the "unlock" button here just flips
 * the local dev entitlement, clearly labeled as a test action rather
 * than pretending to be a real purchase. */
export function PaywallScreen({ visible, onClose, onUnlock }: Props) {
  const { t } = useTranslation();
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={styles.screen}>
        <View style={styles.header}>
          <Pressable onPress={onClose} hitSlop={10} style={styles.closeButton}>
            <Ionicons name="close" size={22} color={colors.text} />
          </Pressable>
        </View>

        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.badge}>
            <Ionicons name="sparkles" size={26} color={colors.citrus} />
          </View>
          <Text style={styles.title}>{t('paywall.title')}</Text>
          <Text style={styles.subtitle}>{t('paywall.subtitle')}</Text>

          <View style={styles.benefits}>
            {BENEFITS.map((benefit) => (
              <View key={benefit.labelKey} style={styles.benefitRow}>
                <View style={styles.benefitIconWrap}>
                  <Ionicons name={benefit.icon} size={18} color={colors.mint} />
                </View>
                <Text style={styles.benefitText}>{t(benefit.labelKey)}</Text>
              </View>
            ))}
          </View>
        </ScrollView>

        <View style={styles.footer}>
          <PillButton title={t('paywall.unlockButton')} onPress={onUnlock} variant="citrus" style={styles.unlockButton} />
          <Text style={styles.disclaimer}>{t('paywall.testDisclaimer')}</Text>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

function createStyles(colors: ColorTheme) {
  return StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: colors.cabinet,
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'flex-end',
      paddingHorizontal: 16,
      paddingTop: 12,
    },
    closeButton: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: colors.panel,
      borderWidth: 1,
      borderColor: colors.panelLine,
      alignItems: 'center',
      justifyContent: 'center',
    },
    content: {
      alignItems: 'center',
      paddingHorizontal: 28,
      paddingTop: 8,
      paddingBottom: 24,
      gap: 6,
    },
    badge: {
      width: 64,
      height: 64,
      borderRadius: 32,
      borderWidth: 2,
      borderColor: colors.citrus,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 10,
    },
    title: {
      fontFamily: fonts.displayBold,
      fontSize: 24,
      color: colors.text,
      textAlign: 'center',
    },
    subtitle: {
      fontSize: 14,
      lineHeight: 20,
      color: colors.text,
      opacity: 0.7,
      textAlign: 'center',
      maxWidth: 300,
      marginTop: 4,
      marginBottom: 20,
    },
    benefits: {
      width: '100%',
      gap: 12,
    },
    benefitRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 14,
      backgroundColor: colors.panel,
      borderWidth: 1,
      borderColor: colors.panelLine,
      borderRadius: 16,
      padding: 14,
    },
    benefitIconWrap: {
      width: 34,
      height: 34,
      borderRadius: 17,
      backgroundColor: 'rgba(47,230,184,0.14)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    benefitText: {
      flex: 1,
      fontSize: 14,
      color: colors.text,
    },
    footer: {
      paddingHorizontal: 28,
      paddingBottom: 20,
      paddingTop: 8,
      gap: 10,
      alignItems: 'stretch',
    },
    unlockButton: {
      width: '100%',
    },
    disclaimer: {
      fontSize: 11.5,
      color: colors.text,
      opacity: 0.5,
      textAlign: 'center',
    },
  });
}
