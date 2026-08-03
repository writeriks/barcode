import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, StyleSheet, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { SUPPORTED_LANGUAGES, type SupportedLanguage } from '../i18n';
import { LANGUAGE_NATIVE_NAMES } from '../i18n/languageNames';
import { colors } from '../theme/colors';
import { fonts } from '../theme/fonts';

interface Props {
  currentOverride: SupportedLanguage | null;
  onSelectLanguage: (code: SupportedLanguage | null) => void;
}

export function SettingsScreen({ currentOverride, onSelectLanguage }: Props) {
  const { t } = useTranslation();
  const tabBarHeight = useBottomTabBarHeight();

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'left', 'right']}>
      <Text style={styles.title}>{t('settings.title')}</Text>

      <ScrollView contentContainerStyle={[styles.list, { paddingBottom: tabBarHeight + 20 }]}>
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
});
