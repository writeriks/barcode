import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { SUPPORTED_LANGUAGES, type SupportedLanguage } from '../i18n';
import { LANGUAGE_NATIVE_NAMES } from '../i18n/languageNames';
import { isPrivacyOptionsRequired, showPrivacyOptionsForm } from '../services/ads/consent';
import {
  isBeepEnabled,
  isVibrateEnabled,
  setBeepEnabled,
  setVibrateEnabled,
} from '../services/scanFeedbackPreference';
import { colors } from '../theme/colors';
import { fonts } from '../theme/fonts';

interface Props {
  currentOverride: SupportedLanguage | null;
  onSelectLanguage: (code: SupportedLanguage | null) => void;
}

export function SettingsScreen({ currentOverride, onSelectLanguage }: Props) {
  const { t } = useTranslation();
  const tabBarHeight = useBottomTabBarHeight();
  const [showPrivacyRow, setShowPrivacyRow] = useState(false);
  const [vibrateEnabled, setVibrateEnabledState] = useState(true);
  const [beepEnabled, setBeepEnabledState] = useState(true);

  useEffect(() => {
    isPrivacyOptionsRequired().then(setShowPrivacyRow);
    isVibrateEnabled().then(setVibrateEnabledState);
    isBeepEnabled().then(setBeepEnabledState);
  }, []);

  const handleToggleVibrate = (value: boolean) => {
    setVibrateEnabledState(value);
    setVibrateEnabled(value);
  };

  const handleToggleBeep = (value: boolean) => {
    setBeepEnabledState(value);
    setBeepEnabled(value);
  };

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'left', 'right']}>
      <Text style={styles.title}>{t('settings.title')}</Text>

      <ScrollView contentContainerStyle={[styles.list, { paddingBottom: tabBarHeight + 20 }]}>
        <Text style={styles.sectionLabel}>{t('settings.scanFeedbackSection')}</Text>
        <ToggleRow
          label={t('settings.vibrate')}
          description={t('settings.vibrateDescription')}
          value={vibrateEnabled}
          onValueChange={handleToggleVibrate}
        />
        <ToggleRow
          label={t('settings.beep')}
          description={t('settings.beepDescription')}
          value={beepEnabled}
          onValueChange={handleToggleBeep}
        />

        <Text style={[styles.sectionLabel, styles.sectionLabelSpaced]}>{t('settings.languageSection')}</Text>
        <Row
          label={t('settings.systemDefault')}
          selected={currentOverride === null}
          onPress={() => onSelectLanguage(null)}
        />
        {SUPPORTED_LANGUAGES.map((code) => (
          <Row
            key={code}
            label={LANGUAGE_NATIVE_NAMES[code]}
            selected={currentOverride === code}
            onPress={() => onSelectLanguage(code)}
          />
        ))}

        {showPrivacyRow ? (
          <>
            <Text style={[styles.sectionLabel, styles.sectionLabelSpaced]}>{t('settings.privacySection')}</Text>
            <Row label={t('settings.privacyChoices')} selected={false} onPress={showPrivacyOptionsForm} />
          </>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

function Row({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
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
}: {
  label: string;
  description: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
}) {
  return (
    <View style={styles.row}>
      <View style={styles.toggleText}>
        <Text style={styles.rowLabel}>{label}</Text>
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

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.cabinet,
  },
  title: {
    fontFamily: fonts.displayBold,
    fontSize: 22,
    color: colors.cream,
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
    color: colors.cream,
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
  rowLabel: {
    fontSize: 15,
    color: colors.cream,
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
  toggleDescription: {
    fontSize: 12,
    color: colors.cream,
    opacity: 0.55,
  },
});
