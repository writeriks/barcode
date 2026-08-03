import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FlatList, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { SafeAreaView } from 'react-native-safe-area-context';
import { PillButton } from '../components/PillButton';
import { deleteMyCode, getMyCodes, saveMyCode } from '../services/myCodes';
import { useThemeColors, useThemeMode } from '../theme/ThemeContext';
import type { ColorTheme } from '../theme/colors';
import { fonts } from '../theme/fonts';
import type { MyCode } from '../types/myCode';

export function MyCodesScreen() {
  const { t } = useTranslation();
  const tabBarHeight = useBottomTabBarHeight();
  const colors = useThemeColors();
  const mode = useThemeMode();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const placeholderColor = mode === 'light' ? 'rgba(36,25,51,0.35)' : 'rgba(255,246,233,0.4)';
  const [codes, setCodes] = useState<MyCode[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [label, setLabel] = useState('');
  const [content, setContent] = useState('');
  const [viewing, setViewing] = useState<MyCode | null>(null);

  const reload = useCallback(() => {
    getMyCodes().then(setCodes);
  }, []);

  useFocusEffect(reload);

  const handleSave = async () => {
    if (!content.trim()) return;
    const code: MyCode = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      label: label.trim() || content.trim(),
      content: content.trim(),
      createdAt: Date.now(),
    };
    await saveMyCode(code);
    setLabel('');
    setContent('');
    setIsCreating(false);
    reload();
  };

  const handleDelete = async (id: string) => {
    await deleteMyCode(id);
    setViewing(null);
    reload();
  };

  if (viewing) {
    return (
      <SafeAreaView style={styles.screen} edges={['top', 'left', 'right']}>
        <View style={styles.viewer}>
          <View style={styles.qrCard}>
            <QRCode value={viewing.content} size={220} color={colors.inkOnCream} backgroundColor={colors.cream} />
          </View>
          <Text style={styles.viewerLabel}>{viewing.label}</Text>
          <Text style={styles.viewerContent} numberOfLines={2}>
            {viewing.content}
          </Text>
          <View style={styles.viewerActions}>
            <PillButton title={t('myCodes.delete')} onPress={() => handleDelete(viewing.id)} variant="ghost" />
            <PillButton title={t('settings.close')} onPress={() => setViewing(null)} variant="punch" />
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'left', 'right']}>
      <View style={styles.header}>
        <Text style={styles.title}>{t('myCodes.title')}</Text>
        {!isCreating ? (
          <Pressable onPress={() => setIsCreating(true)} style={styles.addButton} hitSlop={10}>
            <Text style={styles.addGlyph}>+</Text>
          </Pressable>
        ) : null}
      </View>

      {isCreating ? (
        <ScrollView contentContainerStyle={styles.form} keyboardShouldPersistTaps="handled">
          <TextInput
            style={styles.input}
            placeholder={t('myCodes.labelPlaceholder')}
            placeholderTextColor={placeholderColor}
            value={label}
            onChangeText={setLabel}
          />
          <TextInput
            style={styles.input}
            placeholder={t('myCodes.contentPlaceholder')}
            placeholderTextColor={placeholderColor}
            value={content}
            onChangeText={setContent}
            multiline
          />
          <View style={styles.formActions}>
            <PillButton
              title={t('myCodes.cancel')}
              onPress={() => {
                setIsCreating(false);
                setLabel('');
                setContent('');
              }}
              variant="ghost"
            />
            <PillButton title={t('myCodes.save')} onPress={handleSave} variant="citrus" />
          </View>
        </ScrollView>
      ) : codes.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyTitle}>{t('myCodes.empty')}</Text>
          <Text style={styles.emptyBody}>{t('myCodes.emptyBody')}</Text>
          <PillButton title={t('myCodes.create')} onPress={() => setIsCreating(true)} variant="citrus" />
        </View>
      ) : (
        <FlatList
          data={codes}
          keyExtractor={(item) => item.id}
          contentContainerStyle={[styles.list, { paddingBottom: tabBarHeight + 20 }]}
          renderItem={({ item }) => (
            <Pressable
              style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
              onPress={() => setViewing(item)}
            >
              <View style={styles.qrThumb}>
                <QRCode value={item.content} size={40} color={colors.inkOnCream} backgroundColor={colors.cream} />
              </View>
              <Text style={styles.rowLabel} numberOfLines={1}>
                {item.label}
              </Text>
            </Pressable>
          )}
        />
      )}
    </SafeAreaView>
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
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: 20,
      paddingBottom: 8,
    },
    title: {
      fontFamily: fonts.displayBold,
      fontSize: 22,
      color: colors.text,
    },
    addButton: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: colors.panel,
      borderWidth: 1,
      borderColor: colors.panelLine,
      alignItems: 'center',
      justifyContent: 'center',
    },
    addGlyph: {
      fontSize: 20,
      color: colors.mint,
      marginTop: -2,
    },
    empty: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      padding: 28,
      gap: 10,
    },
    emptyTitle: {
      fontFamily: fonts.displayBold,
      fontSize: 17,
      color: colors.text,
    },
    emptyBody: {
      fontSize: 13.5,
      color: colors.text,
      opacity: 0.6,
      textAlign: 'center',
      maxWidth: 260,
      marginBottom: 6,
    },
    list: {
      paddingHorizontal: 20,
      gap: 10,
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 14,
      backgroundColor: colors.panel,
      borderWidth: 1,
      borderColor: colors.panelLine,
      borderRadius: 16,
      padding: 12,
    },
    rowPressed: {
      opacity: 0.75,
    },
    qrThumb: {
      width: 48,
      height: 48,
      borderRadius: 8,
      backgroundColor: colors.cream,
      alignItems: 'center',
      justifyContent: 'center',
    },
    rowLabel: {
      flex: 1,
      fontFamily: fonts.displayBold,
      fontSize: 14.5,
      color: colors.text,
    },
    form: {
      padding: 20,
      gap: 12,
    },
    input: {
      backgroundColor: colors.panel,
      borderWidth: 1,
      borderColor: colors.panelLine,
      borderRadius: 14,
      paddingHorizontal: 16,
      paddingVertical: 12,
      color: colors.text,
      fontSize: 14,
    },
    formActions: {
      flexDirection: 'row',
      justifyContent: 'flex-end',
      gap: 12,
      marginTop: 4,
    },
    viewer: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      padding: 28,
      gap: 14,
    },
    qrCard: {
      backgroundColor: colors.cream,
      padding: 20,
      borderRadius: 20,
    },
    viewerLabel: {
      fontFamily: fonts.displayBold,
      fontSize: 18,
      color: colors.text,
      textAlign: 'center',
    },
    viewerContent: {
      fontSize: 13,
      color: colors.text,
      opacity: 0.6,
      textAlign: 'center',
      maxWidth: 280,
    },
    viewerActions: {
      flexDirection: 'row',
      gap: 12,
      marginTop: 8,
    },
  });
}
