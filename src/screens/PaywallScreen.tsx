import { Ionicons } from '@expo/vector-icons';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Alert, Linking, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { PurchasesOffering, PurchasesPackage } from 'react-native-purchases';
import { SafeAreaView } from 'react-native-safe-area-context';
import { PillButton } from '../components/PillButton';
import { PRIVACY_POLICY_URL, TERMS_OF_USE_URL } from '../config/appInfo';
import { fetchCurrentOffering, purchasePackage, restorePurchases } from '../premium/revenueCat';
import { useThemeColors } from '../theme/ThemeContext';
import type { ColorTheme } from '../theme/colors';
import { fonts } from '../theme/fonts';

interface Props {
  visible: boolean;
  onClose: () => void;
  onPurchased: () => void;
}

// Document scanning leads: running out of free scans is the most common
// way to arrive here, so the reason has to be the first thing listed.
const BENEFITS: { icon: keyof typeof Ionicons.glyphMap; labelKey: string }[] = [
  { icon: 'document-text-outline', labelKey: 'paywall.benefitScans' },
  { icon: 'ban-outline', labelKey: 'paywall.benefitNoAds' },
  { icon: 'infinite-outline', labelKey: 'paywall.benefitHistory' },
  { icon: 'options-outline', labelKey: 'paywall.benefitSettings' },
];

type PlanId = 'weekly' | 'monthly';

// Deliberately no hardcoded fallback price — every price on this screen
// comes from RevenueCat's live offering or isn't shown at all. A plan
// with no package (still loading, or the offering/entitlement isn't
// configured yet — see premium/revenueCat.ts) renders unpriced and
// can't be purchased.
interface PlanDisplay {
  id: PlanId;
  unitKey: string;
  badgeKey?: string;
  pkg: PurchasesPackage | null;
}

function buildPlans(offering: PurchasesOffering | null): PlanDisplay[] {
  const weeklyPkg = offering?.weekly ?? null;
  const monthlyPkg = offering?.monthly ?? null;

  return [
    { id: 'weekly', unitKey: 'paywall.unitWeek', pkg: weeklyPkg },
    { id: 'monthly', unitKey: 'paywall.unitMonth', badgeKey: 'paywall.bestValue', pkg: monthlyPkg },
  ];
}

/** The upgrade pitch, shown whenever a free user taps a premium-gated
 * toggle or hits the free history limit. Every price shown here comes
 * live from RevenueCat's current offering (weekly/monthly packages,
 * predefined package types — see the RevenueCat dashboard) — there is no
 * hardcoded fallback, so wherever the offering can't be fetched (Expo Go,
 * Android, no network, or the dashboard isn't configured yet) the plan
 * renders unpriced and can't be purchased. Includes the elements Apple's
 * auto-renewable subscription review requires (Guideline 3.1.2):
 * price/length per plan, an auto-renewal notice, Restore Purchases, and
 * working Privacy Policy/Terms links. */
export function PaywallScreen({ visible, onClose, onPurchased }: Props) {
  const { t } = useTranslation();
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [selectedPlan, setSelectedPlan] = useState<PlanId>('monthly');
  const [offering, setOffering] = useState<PurchasesOffering | null>(null);
  const [offeringsLoaded, setOfferingsLoaded] = useState(false);
  const [isBusy, setIsBusy] = useState(false);

  useEffect(() => {
    if (!visible) return;
    let cancelled = false;
    setOfferingsLoaded(false);
    fetchCurrentOffering().then((current) => {
      if (cancelled) return;
      setOffering(current);
      setOfferingsLoaded(true);
    });
    return () => {
      cancelled = true;
    };
  }, [visible]);

  const plans = useMemo(() => buildPlans(offering), [offering]);
  const selectedPlanDisplay = plans.find((plan) => plan.id === selectedPlan) ?? plans[0];

  const handleContinue = async () => {
    if (isBusy || !offeringsLoaded) return;
    if (!selectedPlanDisplay.pkg) {
      Alert.alert(t('paywall.storeUnavailableTitle'), t('paywall.storeUnavailableBody'));
      return;
    }
    setIsBusy(true);
    try {
      const { isPremium, cancelled } = await purchasePackage(selectedPlanDisplay.pkg);
      if (isPremium) onPurchased();
      else if (!cancelled) Alert.alert(t('paywall.purchaseFailedTitle'), t('paywall.purchaseFailedBody'));
    } catch {
      Alert.alert(t('paywall.purchaseFailedTitle'), t('paywall.purchaseFailedBody'));
    } finally {
      setIsBusy(false);
    }
  };

  const handleRestore = async () => {
    if (isBusy) return;
    setIsBusy(true);
    try {
      const isPremium = await restorePurchases();
      if (isPremium) onPurchased();
      else Alert.alert(t('paywall.restoreNoneTitle'), t('paywall.restoreNoneBody'));
    } catch {
      Alert.alert(t('paywall.restoreNoneTitle'), t('paywall.restoreNoneBody'));
    } finally {
      setIsBusy(false);
    }
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
            {plans.map((plan) => {
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
                  {!offeringsLoaded ? (
                    <ActivityIndicator size="small" color={colors.text} style={styles.planLoading} />
                  ) : plan.pkg ? (
                    <>
                      <Text style={styles.planPrice}>{plan.pkg.product.priceString}</Text>
                      <Text style={styles.planUnit}>{t(plan.unitKey)}</Text>
                      {plan.id === 'monthly' && plan.pkg.product.pricePerWeekString ? (
                        <Text style={styles.planSubLabel}>
                          {t('paywall.perWeekEquivalent', { price: plan.pkg.product.pricePerWeekString })}
                        </Text>
                      ) : null}
                    </>
                  ) : (
                    <Text style={styles.planUnavailable}>{t('paywall.planUnavailable')}</Text>
                  )}
                </Pressable>
              );
            })}
          </View>
        </ScrollView>

        <View style={styles.footer}>
          <PillButton
            title={
              isBusy
                ? t('paywall.processingButton')
                : !offeringsLoaded
                  ? t('paywall.loadingButton')
                  : selectedPlanDisplay.pkg
                    ? t('paywall.continueButton', {
                        price: selectedPlanDisplay.pkg.product.priceString,
                        unit: t(selectedPlanDisplay.unitKey),
                      })
                    : t('paywall.storeUnavailableTitle')
            }
            onPress={handleContinue}
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
    planLoading: {
      marginVertical: 8,
    },
    planUnavailable: {
      fontSize: 12,
      color: colors.text,
      opacity: 0.5,
      marginVertical: 8,
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
