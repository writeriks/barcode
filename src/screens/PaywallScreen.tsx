import { Ionicons } from '@expo/vector-icons';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, Linking, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { PillButton } from '../components/PillButton';
import { PRIVACY_POLICY_URL, TERMS_OF_USE_URL } from '../config/appInfo';
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

type PlanId = 'weekly' | 'monthly';

// Real App Store Connect pricing (USD base tier) — once RevenueCat is
// wired up, swap these for the live localized price/period off each
// `PurchasesPackage.product`, which is what Apple actually expects users
// to see (their local currency, not a hardcoded USD string).
interface Plan {
  id: PlanId;
  price: string;
  unitKey: string;
  subLabelKey?: string;
  badgeKey?: string;
}

const PLANS: Plan[] = [
  { id: 'weekly', price: '$1.49', unitKey: 'paywall.unitWeek' },
  {
    id: 'monthly',
    price: '$4.99',
    unitKey: 'paywall.unitMonth',
    subLabelKey: 'paywall.perWeekEquivalent',
    badgeKey: 'paywall.bestValue',
  },
];

/** The upgrade pitch, shown whenever a free user taps a premium-gated
 * toggle or hits the free history limit. Purchases aren't wired to
 * RevenueCat yet (see premium/premiumPreference.ts) — "unlock" just flips
 * the local dev entitlement — but the screen itself is meant to be
 * production-ready: it's what gets screenshotted for Apple's
 * auto-renewable subscription review (Guideline 3.1.2), which is why the
 * price/length/renewal terms and the Privacy/Terms links are all here. */
export function PaywallScreen({ visible, onClose, onUnlock }: Props) {
  const { t } = useTranslation();
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [selectedPlan, setSelectedPlan] = useState<PlanId>('monthly');

  const activePlan = PLANS.find((plan) => plan.id === selectedPlan) ?? PLANS[0];

  const handleRestore = () => {
    Alert.alert(t('paywall.restoreNoneTitle'), t('paywall.restoreNoneBody'));
  };

  const openLink = (url: string) => {
    Linking.canOpenURL(url).then((supported) => {
      if (supported) Linking.openURL(url);
    });
  };

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

          <View style={styles.plans}>
            {PLANS.map((plan) => {
              const selected = plan.id === selectedPlan;
              return (
                <Pressable
                  key={plan.id}
                  onPress={() => setSelectedPlan(plan.id)}
                  style={[styles.planCard, selected && styles.planCardSelected]}
                >
                  {plan.badgeKey ? (
                    <View style={styles.planBadge}>
                      <Text style={styles.planBadgeText}>{t(plan.badgeKey)}</Text>
                    </View>
                  ) : null}
                  <View style={styles.planRadio}>
                    <Ionicons
                      name={selected ? 'radio-button-on' : 'radio-button-off'}
                      size={20}
                      color={selected ? colors.mint : colors.text}
                    />
                  </View>
                  <Text style={styles.planPrice}>{plan.price}</Text>
                  <Text style={styles.planUnit}>{t(plan.unitKey)}</Text>
                  {plan.subLabelKey ? <Text style={styles.planSubLabel}>{t(plan.subLabelKey)}</Text> : null}
                </Pressable>
              );
            })}
          </View>
        </ScrollView>

        <View style={styles.footer}>
          <PillButton
            title={t('paywall.continueButton', { price: activePlan.price, unit: t(activePlan.unitKey) })}
            onPress={onUnlock}
            variant="citrus"
            style={styles.continueButton}
          />
          <Text style={styles.autoRenewNotice}>{t('paywall.autoRenewNotice')}</Text>
          <View style={styles.legalRow}>
            <Pressable onPress={handleRestore} hitSlop={6}>
              <Text style={styles.legalLink}>{t('paywall.restorePurchases')}</Text>
            </Pressable>
            <Text style={styles.legalDivider}>·</Text>
            <Pressable onPress={() => openLink(PRIVACY_POLICY_URL)} hitSlop={6}>
              <Text style={styles.legalLink}>{t('paywall.privacyPolicy')}</Text>
            </Pressable>
            <Text style={styles.legalDivider}>·</Text>
            <Pressable onPress={() => openLink(TERMS_OF_USE_URL)} hitSlop={6}>
              <Text style={styles.legalLink}>{t('paywall.termsOfUse')}</Text>
            </Pressable>
          </View>
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
    plans: {
      flexDirection: 'row',
      width: '100%',
      gap: 12,
      marginTop: 22,
    },
    planCard: {
      flex: 1,
      alignItems: 'center',
      backgroundColor: colors.panel,
      borderWidth: 1.5,
      borderColor: colors.panelLine,
      borderRadius: 18,
      paddingTop: 22,
      paddingBottom: 16,
      paddingHorizontal: 10,
      gap: 4,
    },
    planCardSelected: {
      borderColor: colors.mint,
    },
    planBadge: {
      position: 'absolute',
      top: -10,
      alignSelf: 'center',
      backgroundColor: colors.mint,
      borderRadius: 999,
      paddingHorizontal: 10,
      paddingVertical: 3,
    },
    planBadgeText: {
      fontFamily: fonts.displayBold,
      fontSize: 9.5,
      letterSpacing: 0.4,
      color: colors.inkOnCream,
    },
    planRadio: {
      marginBottom: 4,
    },
    planPrice: {
      fontFamily: fonts.displayBold,
      fontSize: 20,
      color: colors.text,
    },
    planUnit: {
      fontSize: 12.5,
      color: colors.text,
      opacity: 0.6,
    },
    planSubLabel: {
      fontSize: 11,
      color: colors.mintText,
      marginTop: 4,
    },
    footer: {
      paddingHorizontal: 28,
      paddingBottom: 20,
      paddingTop: 12,
      gap: 10,
      alignItems: 'stretch',
    },
    continueButton: {
      width: '100%',
    },
    autoRenewNotice: {
      fontSize: 11,
      lineHeight: 15,
      color: colors.text,
      opacity: 0.5,
      textAlign: 'center',
    },
    legalRow: {
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
      gap: 8,
      marginTop: 2,
    },
    legalLink: {
      fontSize: 11.5,
      color: colors.text,
      opacity: 0.65,
      textDecorationLine: 'underline',
    },
    legalDivider: {
      fontSize: 11.5,
      color: colors.text,
      opacity: 0.3,
    },
  });
}
