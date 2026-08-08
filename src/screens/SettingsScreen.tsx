import { Ionicons } from '@expo/vector-icons';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BottomSheet } from '../components/BottomSheet';
import { SegmentedControl } from '../components/SegmentedControl';
import { SUPPORTED_LANGUAGES, type SupportedLanguage } from '../i18n';
import { LANGUAGE_NATIVE_NAMES } from '../i18n/languageNames';
import { usePremium } from '../premium/PremiumContext';
import { isPrivacyOptionsRequired, showPrivacyOptionsForm } from '../services/ads/consent';
import { authenticateAppUnlock, isDeviceLockSupported, setAppLockEnabled } from '../services/appLock';
import { captureAnalyticsEvent } from '../services/analytics';
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
  const { t } = useTranslation();
  const tabBarHeight = useBottomTabBarHeight();
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { isPremium, setPremium, openPaywall } = usePremium();
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

  // All of the toggles below are premium-only — a free user tapping one
  // opens the paywall instead of changing anything.
  const withPremiumGate =
    (handler: (value: boolean) => void) =>
    (value: boolean): void => {
      if (!isPremium) {
        openPaywall();
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
        <Pressable onPress={isPremium ? undefined : openPaywall} style={styles.row}>
          <View style={styles.toggleText}>
            <Text style={styles.rowLabel}>{isPremium ? t('settings.premiumActive') : t('settings.premiumUpgrade')}</Text>
            <Text style={styles.toggleDescription}>
              {isPremium ? t('settings.premiumActiveDescription') : t('settings.premiumUpgradeDescription')}
            </Text>
          </View>
          {isPremium ? (
            <Ionicons name="checkmark-circle" size={20} color={colors.mint} />
          ) : (
            <Ionicons name="chevron-forward" size={18} color={colors.text} style={styles.dropdownChevron} />
          )}
        </Pressable>
        {__DEV__ ? (
          <ToggleRow
            label={t('settings.premiumDevToggle')}
            description={t('settings.premiumDevToggleDescription')}
            value={isPremium}
            onValueChange={setPremium}
            colors={colors}
            styles={styles}
          />
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
    toggleDescription: {
      fontSize: 12,
      color: colors.text,
      opacity: 0.55,
    },
  });
}
