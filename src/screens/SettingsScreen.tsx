import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SUPPORTED_LANGUAGES, type SupportedLanguage } from '../i18n';
import { LANGUAGE_NATIVE_NAMES } from '../i18n/languageNames';
import { colors } from '../theme/colors';
import { fonts } from '../theme/fonts';

interface Props {
  currentOverride: SupportedLanguage | null;
  onSelectLanguage: (code: SupportedLanguage | null) => void;
  onClose: () => void;
}

export function SettingsScreen({ currentOverride, onSelectLanguage, onClose }: Props) {
  const { t } = useTranslation();

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <Pressable onPress={onClose} hitSlop={12} style={styles.closeButton}>
          <Text style={styles.closeGlyph}>×</Text>
        </Pressable>
        <Text style={styles.title}>{t('settings.title')}</Text>
        <View style={styles.closeButton} />
      </View>

      <ScrollView contentContainerStyle={styles.list}>
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
    </View>
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingTop: 16,
    paddingBottom: 8,
  },
  closeButton: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeGlyph: {
    fontSize: 22,
    color: colors.cream,
    opacity: 0.8,
  },
  title: {
    fontFamily: fonts.displayBold,
    fontSize: 17,
    color: colors.cream,
  },
  list: {
    padding: 20,
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
