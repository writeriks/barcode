import { Ionicons } from '@expo/vector-icons';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import * as Application from 'expo-application';
import * as Clipboard from 'expo-clipboard';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, Linking, Platform, Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BottomSheet } from '../components/BottomSheet';
import { SegmentedControl } from '../components/SegmentedControl';
import { APP_NAME, FAQ_URL, PRIVACY_POLICY_URL, SUPPORT_EMAIL, TERMS_OF_USE_URL, WEBSITE_URL } from '../config/appInfo';
import { IS_PREMIUM_OVERRIDE_AVAILABLE } from '../config/premiumEnv';
import { SUPPORTED_LANGUAGES, type SupportedLanguage } from '../i18n';
import { LANGUAGE_NATIVE_NAMES } from '../i18n/languageNames';
import { usePremium } from '../premium/PremiumContext';
import { showManageSubscriptions } from '../premium/revenueCat';
import { isPrivacyOptionsRequired, showPrivacyOptionsForm } from '../services/ads/consent';
import { authenticateAppUnlock, isDeviceLockSupported, setAppLockEnabled } from '../services/appLock';
import { captureAnalyticsEvent } from '../services/analytics';
import { resetFreeScans } from '../services/documentScanQuota';
import {
  isDuplicateScansEnabled,
  isHistorySavingEnabled,
  setDuplicateScansEnabled,
  setHistorySavingEnabled,
} from '../services/historyPreference';
import {
  isBeepEnabled,
  isVibrateEnabled,
  setBeepEnabled,
  setVibrateEnabled,
} from '../services/scanFeedbackPreference';
import { isBatchScanEnabled, setBatchScanEnabled } from '../services/scannerPreference';
import { useThemeColors } from '../theme/ThemeContext';
import type { ColorTheme } from '../theme/colors';
import type { ThemePreference } from '../theme/themePreference';
import { fonts } from '../theme/fonts';

interface Props {
  currentOverride: SupportedLanguage | null;
  onSelectLanguage: (code: SupportedLanguage | null) => void;
  themePreference: ThemePreference;
  onSelectTheme: (preference: ThemePreference) => void;
  appLockEnabled: boolean;
  onAppLockChanged: (enabled: boolean) => void;
}

export function SettingsScreen({
  currentOverride,
  onSelectLanguage,
  themePreference,
  onSelectTheme,
  appLockEnabled,
  onAppLockChanged,
}: Props) {
  const { t, i18n } = useTranslation();
  const tabBarHeight = useBottomTabBarHeight();
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { isPremium, isCancelled, expirationDate, devOverride, setPremium, openPaywall, refreshPremium } =
    usePremium();
  const [showPrivacyRow, setShowPrivacyRow] = useState(false);
  const [vibrateEnabled, setVibrateEnabledState] = useState(true);
  const [beepEnabled, setBeepEnabledState] = useState(true);
  const [historyEnabled, setHistoryEnabledState] = useState(true);
  const [duplicateScansEnabled, setDuplicateScansEnabledState] = useState(true);
  const [batchScanEnabled, setBatchScanEnabledState] = useState(false);
  const [isLanguageSheetOpen, setIsLanguageSheetOpen] = useState(false);

  useEffect(() => {
    isPrivacyOptionsRequired().then(setShowPrivacyRow);
    isVibrateEnabled().then(setVibrateEnabledState);
    isBeepEnabled().then(setBeepEnabledState);
    isHistorySavingEnabled().then(setHistoryEnabledState);
    isDuplicateScansEnabled().then(setDuplicateScansEnabledState);
    isBatchScanEnabled().then(setBatchScanEnabledState);
  }, []);

  const handleToggleVibrate = (value: boolean) => {
    setVibrateEnabledState(value);
    setVibrateEnabled(value);
    captureAnalyticsEvent('setting_changed', { setting: 'vibrate', value });
  };

  const handleToggleBeep = (value: boolean) => {
    setBeepEnabledState(value);
    setBeepEnabled(value);
    captureAnalyticsEvent('setting_changed', { setting: 'beep', value });
  };

  const handleToggleHistory = (value: boolean) => {
    setHistoryEnabledState(value);
    setHistorySavingEnabled(value);
    captureAnalyticsEvent('setting_changed', { setting: 'history_saving', value });
  };

  const handleToggleDuplicateScans = (value: boolean) => {
    setDuplicateScansEnabledState(value);
    setDuplicateScansEnabled(value);
    captureAnalyticsEvent('setting_changed', { setting: 'duplicate_scans', value });
  };

  const handleToggleBatchScan = (value: boolean) => {
    setBatchScanEnabledState(value);
    setBatchScanEnabled(value);
    captureAnalyticsEvent('setting_changed', { setting: 'batch_scan', value });
  };

  const handleToggleAppLock = async (value: boolean) => {
    if (value) {
      const supported = await isDeviceLockSupported();
      if (!supported) {
        Alert.alert(t('settings.lockAppUnsupportedTitle'), t('settings.lockAppUnsupportedBody'));
        return;
      }
      const authenticated = await authenticateAppUnlock(t('settings.lockAppPrompt'));
      if (!authenticated) return;
    }
    await setAppLockEnabled(value);
    onAppLockChanged(value);
    captureAnalyticsEvent('setting_changed', { setting: 'app_lock', value });
  };

  const handleSelectTheme = (preference: ThemePreference) => {
    captureAnalyticsEvent('setting_changed', { setting: 'theme', value: preference ?? 'system' });
    onSelectTheme(preference);
  };

  const handleSelectLanguage = (code: SupportedLanguage | null) => {
    captureAnalyticsEvent('setting_changed', { setting: 'language', value: code ?? 'system' });
    onSelectLanguage(code);
    setIsLanguageSheetOpen(false);
  };

  const currentLanguageLabel =
    currentOverride === null ? t('settings.systemDefault') : LANGUAGE_NATIVE_NAMES[currentOverride];

  const handleManageSubscription = async () => {
    captureAnalyticsEvent('manage_subscription_opened');
    try {
      await showManageSubscriptions();
    } finally {
      // The sheet is Apple's; cancellation is written there, not here.
      // Drop the SDK cache so Settings can show cancelled / expired
      // instead of the pre-sheet "Premium active" snapshot.
      await refreshPremium();
    }
  };

  const openLink = (url: string) => {
    Linking.canOpenURL(url).then((supported) => {
      if (supported) Linking.openURL(url);
    });
  };

  const handleContact = async () => {
    const version = Application.nativeApplicationVersion ?? '?';
    const build = Application.nativeBuildVersion ?? '?';
    const subject = encodeURIComponent(`${APP_NAME} — ${t('settings.contactSubject')}`);
    const body = encodeURIComponent(
      `${t('settings.contactPlaceholder')}\n\n\n---\nApp: ${APP_NAME}\nVersion: ${version} (${build})\nPlatform: ${Platform.OS} ${Platform.Version}`
    );
    const mailto = `mailto:${SUPPORT_EMAIL}?subject=${subject}&body=${body}`;

    const supported = await Linking.canOpenURL(mailto);
    if (supported) {
      Linking.openURL(mailto);
      return;
    }
    Alert.alert(t('settings.contactUnavailableTitle'), t('settings.contactUnavailableBody', { email: SUPPORT_EMAIL }), [
      {
        text: t('settings.copyEmail'),
        onPress: () => Clipboard.setStringAsync(SUPPORT_EMAIL),
      },
      { text: t('settings.close') },
    ]);
  };

  const handleResetFreeScans = async () => {
    await resetFreeScans();
    Alert.alert('Free document scans reset');
  };

  // All of the toggles below are premium-only — a free user tapping one
  // opens the paywall instead of changing anything.
  const withPremiumGate =
    (handler: (value: boolean) => void) =>
    (value: boolean): void => {
      if (!isPremium) {
        openPaywall('settings');
        return;
      }
      handler(value);
    };

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'left', 'right']}>
      <Text style={styles.title}>{t('settings.title')}</Text>

      <ScrollView contentContainerStyle={[styles.list, { paddingBottom: tabBarHeight + 20 }]}>
        <Text style={styles.sectionLabel}>{t('settings.appearanceSection')}</Text>
        <SegmentedControl
          value={themePreference}
          onChange={handleSelectTheme}
          options={[
            { value: null, label: t('settings.systemDefault') },
            { value: 'light', label: t('settings.light') },
            { value: 'dark', label: t('settings.dark') },
          ]}
        />

        <Text style={[styles.sectionLabel, styles.sectionLabelSpaced]}>{t('settings.premiumSection')}</Text>
        <PremiumPromoCard
          status={isPremium ? (isCancelled ? 'cancelled' : 'active') : 'free'}
          title={
            !isPremium
              ? t('settings.premiumUpgrade')
              : isCancelled
                ? t('settings.premiumCancelled')
                : t('settings.premiumActive')
          }
          description={
            !isPremium
              ? t('settings.premiumUpgradeDescription')
              : isCancelled
                ? expirationDate
                  ? t('settings.premiumCancelledDescription', {
                      date: new Date(expirationDate).toLocaleDateString(i18n.language, {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                      }),
                    })
                  : t('settings.premiumCancelledDescriptionNoDate')
                : t('settings.premiumActiveDescription')
          }
          cta={t('settings.premiumUpgrade')}
          onPress={isPremium ? handleManageSubscription : () => openPaywall('general')}
          colors={colors}
          styles={styles}
        />
        {IS_PREMIUM_OVERRIDE_AVAILABLE ? (
          <>
            <ToggleRow
              label={t('settings.premiumDevToggle')}
              description={t('settings.premiumDevToggleDescription')}
              value={devOverride}
              onValueChange={setPremium}
              colors={colors}
              styles={styles}
            />
            {/* Deliberately untranslated: these two rows only exist in a
                build made with EXPO_PUBLIC_PREMIUM_TESTING, so no user
                ever sees them and translating them would just add seven
                strings nobody reads. */}
            <Pressable
              onPress={handleResetFreeScans}
              style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
            >
              <View style={styles.toggleText}>
                <Text style={styles.rowLabel}>Reset free document scans</Text>
                <Text style={styles.toggleDescription}>
                  Hands back the free scan allowance so the free flow can be tested again.
                </Text>
              </View>
              <Ionicons name="refresh" size={18} color={colors.text} style={styles.dropdownChevron} />
            </Pressable>
          </>
        ) : null}

        <Text style={[styles.sectionLabel, styles.sectionLabelSpaced]}>{t('settings.appSettingsSection')}</Text>
        <ToggleRow
          label={t('settings.lockApp')}
          description={t('settings.lockAppDescription')}
          value={appLockEnabled}
          onValueChange={withPremiumGate(handleToggleAppLock)}
          locked={!isPremium}
          colors={colors}
          styles={styles}
        />

        <Text style={[styles.sectionLabel, styles.sectionLabelSpaced]}>{t('settings.generalSection')}</Text>
        <ToggleRow
          label={t('settings.batchScan')}
          description={t('settings.batchScanDescription')}
          value={batchScanEnabled}
          onValueChange={withPremiumGate(handleToggleBatchScan)}
          locked={!isPremium}
          colors={colors}
          styles={styles}
        />
        <ToggleRow
          label={t('settings.vibrate')}
          description={t('settings.vibrateDescription')}
          value={vibrateEnabled}
          onValueChange={withPremiumGate(handleToggleVibrate)}
          locked={!isPremium}
          colors={colors}
          styles={styles}
        />
        <ToggleRow
          label={t('settings.beep')}
          description={t('settings.beepDescription')}
          value={beepEnabled}
          onValueChange={withPremiumGate(handleToggleBeep)}
          locked={!isPremium}
          colors={colors}
          styles={styles}
        />
        <ToggleRow
          label={t('settings.historySaving')}
          description={t('settings.historySavingDescription')}
          value={historyEnabled}
          onValueChange={withPremiumGate(handleToggleHistory)}
          locked={!isPremium}
          colors={colors}
          styles={styles}
        />
        <ToggleRow
          label={t('settings.duplicateScans')}
          description={t('settings.duplicateScansDescription')}
          value={duplicateScansEnabled}
          onValueChange={withPremiumGate(handleToggleDuplicateScans)}
          locked={!isPremium}
          colors={colors}
          styles={styles}
        />

        <Text style={[styles.sectionLabel, styles.sectionLabelSpaced]}>{t('settings.languageSection')}</Text>
        <Pressable
          onPress={() => setIsLanguageSheetOpen(true)}
          style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
        >
          <Text style={styles.rowLabel}>{t('settings.languageSection')}</Text>
          <View style={styles.dropdownValue}>
            <Text style={styles.dropdownValueText}>{currentLanguageLabel}</Text>
            <Ionicons name="chevron-down" size={16} color={colors.text} style={styles.dropdownChevron} />
          </View>
        </Pressable>

        {showPrivacyRow ? (
          <>
            <Text style={[styles.sectionLabel, styles.sectionLabelSpaced]}>{t('settings.privacySection')}</Text>
            <Row label={t('settings.privacyChoices')} selected={false} onPress={showPrivacyOptionsForm} styles={styles} />
          </>
        ) : null}

        <Text style={[styles.sectionLabel, styles.sectionLabelSpaced]}>{t('settings.aboutSection')}</Text>
        <LinkRow icon="globe-outline" label={t('settings.website')} onPress={() => openLink(WEBSITE_URL)} colors={colors} styles={styles} />
        <LinkRow icon="help-circle-outline" label={t('settings.faq')} onPress={() => openLink(FAQ_URL)} colors={colors} styles={styles} />
        <LinkRow
          icon="shield-checkmark-outline"
          label={t('paywall.privacyPolicy')}
          onPress={() => openLink(PRIVACY_POLICY_URL)}
          colors={colors}
          styles={styles}
        />
        <LinkRow
          icon="document-text-outline"
          label={t('paywall.termsOfUse')}
          onPress={() => openLink(TERMS_OF_USE_URL)}
          colors={colors}
          styles={styles}
        />
        <LinkRow icon="mail-outline" label={t('settings.contact')} onPress={handleContact} colors={colors} styles={styles} />
      </ScrollView>

      <BottomSheet
        visible={isLanguageSheetOpen}
        onClose={() => setIsLanguageSheetOpen(false)}
        title={t('settings.languageSection')}
      >
        <View style={styles.sheetList}>
          <Row
            label={t('settings.systemDefault')}
            selected={currentOverride === null}
            onPress={() => handleSelectLanguage(null)}
            styles={styles}
          />
          {SUPPORTED_LANGUAGES.map((code) => (
            <Row
              key={code}
              label={LANGUAGE_NATIVE_NAMES[code]}
              selected={currentOverride === code}
              onPress={() => handleSelectLanguage(code)}
              styles={styles}
            />
          ))}
        </View>
      </BottomSheet>
    </SafeAreaView>
  );
}

type Styles = ReturnType<typeof createStyles>;

function PremiumPromoCard({
  status,
  title,
  description,
  cta,
  onPress,
  colors,
  styles,
}: {
  status: 'free' | 'active' | 'cancelled';
  title: string;
  description: string;
  cta: string;
  onPress: () => void;
  colors: ColorTheme;
  styles: Styles;
}) {
  const isActive = status === 'active';
  const isCancelled = status === 'cancelled';
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={title}
      style={({ pressed }) => [
        styles.premiumCard,
        isActive && styles.premiumCardActive,
        isCancelled && styles.premiumCardCancelled,
        pressed && styles.rowPressed,
      ]}
    >
      <View style={styles.premiumCardHeader}>
        <View
          style={[
            styles.premiumBadge,
            isActive && styles.premiumBadgeActive,
            isCancelled && styles.premiumBadgeCancelled,
          ]}
        >
          <Ionicons
            name={isActive ? 'checkmark-circle' : isCancelled ? 'time-outline' : 'sparkles'}
            size={22}
            color={isActive ? colors.mint : colors.citrus}
          />
        </View>
        <View style={styles.premiumCardText}>
          <Text style={styles.premiumCardTitle}>{title}</Text>
          <Text style={styles.premiumCardDescription}>{description}</Text>
        </View>
      </View>
      {status === 'free' ? (
        <View style={styles.premiumCta} pointerEvents="none">
          <Text style={styles.premiumCtaText}>{cta}</Text>
        </View>
      ) : null}
    </Pressable>
  );
}

function Row({
  label,
  selected,
  onPress,
  styles,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
  styles: Styles;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.row, selected && styles.rowSelected, pressed && styles.rowPressed]}
    >
      <Text style={styles.rowLabel}>{label}</Text>
      {selected ? <Text style={styles.checkmark}>✓</Text> : null}
    </Pressable>
  );
}

function LinkRow({
  icon,
  label,
  onPress,
  colors,
  styles,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
  colors: ColorTheme;
  styles: Styles;
}) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}>
      <View style={styles.toggleLabelRow}>
        <Ionicons name={icon} size={16} color={colors.text} style={styles.linkRowIcon} />
        <Text style={styles.rowLabel}>{label}</Text>
      </View>
      <Ionicons name="chevron-forward" size={16} color={colors.text} style={styles.dropdownChevron} />
    </Pressable>
  );
}

function ToggleRow({
  label,
  description,
  value,
  onValueChange,
  locked,
  colors,
  styles,
}: {
  label: string;
  description: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
  locked?: boolean;
  colors: ColorTheme;
  styles: Styles;
}) {
  return (
    <View style={styles.row}>
      <View style={styles.toggleText}>
        <View style={styles.toggleLabelRow}>
          <Text style={styles.rowLabel}>{label}</Text>
          {locked ? <Ionicons name="lock-closed" size={12} color={colors.text} style={styles.lockIcon} /> : null}
        </View>
        <Text style={styles.toggleDescription}>{description}</Text>
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        trackColor={{ false: colors.panelLine, true: colors.mint }}
        thumbColor={colors.cream}
      />
    </View>
  );
}

function createStyles(colors: ColorTheme) {
  return StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: colors.cabinet,
    },
    title: {
      fontFamily: fonts.displayBold,
      fontSize: 22,
      color: colors.text,
      padding: 20,
      paddingBottom: 8,
    },
    list: {
      paddingHorizontal: 20,
      gap: 10,
    },
    sectionLabel: {
      fontFamily: fonts.displayBold,
      fontSize: 11,
      letterSpacing: 0.5,
      textTransform: 'uppercase',
      color: colors.text,
      opacity: 0.5,
      marginBottom: 2,
    },
    sectionLabelSpaced: {
      marginTop: 10,
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: colors.panel,
      borderWidth: 1,
      borderColor: colors.panelLine,
      borderRadius: 16,
      paddingHorizontal: 16,
      paddingVertical: 14,
    },
    rowSelected: {
      borderColor: colors.mint,
    },
    rowPressed: {
      opacity: 0.8,
    },
    dropdownValue: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    dropdownValueText: {
      fontSize: 14,
      color: colors.text,
      opacity: 0.55,
    },
    dropdownChevron: {
      opacity: 0.55,
    },
    premiumCard: {
      backgroundColor: colors.panel,
      borderWidth: 1.5,
      borderColor: colors.citrus,
      borderRadius: 20,
      padding: 16,
      gap: 14,
      shadowColor: colors.citrus,
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.28,
      shadowRadius: 10,
    },
    premiumCardActive: {
      borderColor: colors.mint,
      shadowColor: colors.mint,
      shadowOpacity: 0.16,
    },
    premiumCardCancelled: {
      borderColor: colors.citrus,
      shadowColor: colors.citrus,
      shadowOpacity: 0.16,
    },
    premiumCardHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    premiumBadge: {
      width: 44,
      height: 44,
      borderRadius: 14,
      backgroundColor: colors.cabinet,
      borderWidth: 1.5,
      borderColor: colors.citrus,
      alignItems: 'center',
      justifyContent: 'center',
    },
    premiumBadgeActive: {
      borderColor: colors.mint,
    },
    premiumBadgeCancelled: {
      borderColor: colors.citrus,
    },
    premiumCardText: {
      flex: 1,
      gap: 3,
    },
    premiumCardTitle: {
      fontFamily: fonts.displayBold,
      fontSize: 16,
      color: colors.text,
    },
    premiumCardDescription: {
      fontSize: 12,
      lineHeight: 17,
      color: colors.text,
      opacity: 0.6,
    },
    premiumCta: {
      backgroundColor: colors.punch,
      borderRadius: 999,
      paddingVertical: 13,
      alignItems: 'center',
      justifyContent: 'center',
    },
    premiumCtaText: {
      fontFamily: fonts.displayBold,
      fontSize: 13.5,
      color: colors.cream,
    },
    sheetList: {
      gap: 10,
      paddingBottom: 6,
    },
    rowLabel: {
      fontSize: 15,
      color: colors.text,
    },
    checkmark: {
      fontSize: 16,
      color: colors.mint,
      fontFamily: fonts.displayBold,
    },
    toggleText: {
      flex: 1,
      marginRight: 12,
      gap: 3,
    },
    toggleLabelRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    lockIcon: {
      opacity: 0.5,
    },
    linkRowIcon: {
      opacity: 0.6,
    },
    toggleDescription: {
      fontSize: 12,
      color: colors.text,
      opacity: 0.55,
    },
  });
}
