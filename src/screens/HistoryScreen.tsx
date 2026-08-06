import { Ionicons } from '@expo/vector-icons';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BottomSheet } from '../components/BottomSheet';
import { FilterPillRow, type PillAccent, type PillOption } from '../components/FilterPillRow';
import { HistoryStatusBadge } from '../components/HistoryStatusBadge';
import { captureAnalyticsEvent } from '../services/analytics';
import { createFolder, deleteFolder, getFolders } from '../services/historyFolders';
import { clearFolderFromEntries, getHistory, setEntryFolder } from '../services/scanHistory';
import { useThemeColors, useThemeMode } from '../theme/ThemeContext';
import type { ColorTheme } from '../theme/colors';
import { fonts } from '../theme/fonts';
import type { HistoryStackParamList } from '../navigation/types';
import type { ScanHistoryEntry } from '../types/history';
import type { HistoryFolder } from '../types/historyFolder';
import type { QrContentType } from '../utils/classifyQrContent';

type Props = NativeStackScreenProps<HistoryStackParamList, 'HistoryList'>;

type TypeFilterValue = 'barcode' | QrContentType;

const FOLDER_ALL = 'all';
const FOLDER_UNFILED = 'unfiled';
const FOLDER_ACCENTS: PillAccent[] = ['punch', 'citrus', 'mint', 'coral'];

const QR_META_KEY: Record<QrContentType, string> = {
  link: 'history.metaQrLink',
  email: 'history.metaQrEmail',
  phone: 'history.metaQrPhone',
  otp: 'history.metaQrOtp',
  text: 'history.metaQrText',
};

const TYPE_FILTER_OPTIONS: { value: TypeFilterValue; labelKey: string; accent: PillAccent }[] = [
  { value: 'barcode', labelKey: 'history.metaBarcode', accent: 'punch' },
  { value: 'link', labelKey: 'qr.typeLink', accent: 'mint' },
  { value: 'email', labelKey: 'qr.typeEmail', accent: 'citrus' },
  { value: 'phone', labelKey: 'qr.typePhone', accent: 'coral' },
  { value: 'otp', labelKey: 'qr.typeOtp', accent: 'punch' },
  { value: 'text', labelKey: 'qr.typeText', accent: 'mint' },
];

function entryTypeValue(entry: ScanHistoryEntry): TypeFilterValue {
  return entry.kind === 'product' ? 'barcode' : entry.contentType;
}

function matchesSearch(entry: ScanHistoryEntry, query: string): boolean {
  if (entry.kind === 'qr') return entry.data.toLowerCase().includes(query);
  const haystack = [entry.barcode, entry.product?.productName, entry.product?.brands]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
  return haystack.includes(query);
}

export function HistoryScreen({ navigation }: Props) {
  const { t } = useTranslation();
  const tabBarHeight = useBottomTabBarHeight();
  const colors = useThemeColors();
  const mode = useThemeMode();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const placeholderColor = mode === 'light' ? 'rgba(36,25,51,0.35)' : 'rgba(255,246,233,0.4)';

  const [entries, setEntries] = useState<ScanHistoryEntry[]>([]);
  const [folders, setFolders] = useState<HistoryFolder[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTypes, setActiveTypes] = useState<Set<TypeFilterValue>>(new Set());
  const [activeFolder, setActiveFolder] = useState<string>(FOLDER_ALL);
  const [assigningEntry, setAssigningEntry] = useState<ScanHistoryEntry | null>(null);
  const [isCreateFolderOpen, setIsCreateFolderOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');

  const reload = useCallback(() => {
    getHistory().then(setEntries);
    getFolders().then(setFolders);
  }, []);

  useFocusEffect(reload);

  const filteredEntries = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return entries.filter((entry) => {
      if (activeTypes.size > 0 && !activeTypes.has(entryTypeValue(entry))) return false;
      if (activeFolder === FOLDER_UNFILED && entry.folderId) return false;
      if (activeFolder !== FOLDER_ALL && activeFolder !== FOLDER_UNFILED && entry.folderId !== activeFolder) {
        return false;
      }
      if (query && !matchesSearch(entry, query)) return false;
      return true;
    });
  }, [entries, searchQuery, activeTypes, activeFolder]);

  const typeOptions: PillOption<TypeFilterValue>[] = useMemo(
    () =>
      TYPE_FILTER_OPTIONS.map((option) => ({ value: option.value, label: t(option.labelKey), accent: option.accent })),
    [t]
  );

  const folderOptions: PillOption<string>[] = useMemo(
    () => [
      { value: FOLDER_ALL, label: t('history.folderAll'), accent: 'mint' },
      { value: FOLDER_UNFILED, label: t('history.folderUnfiled'), accent: 'coral' },
      ...folders.map((folder, index) => ({
        value: folder.id,
        label: folder.name,
        accent: FOLDER_ACCENTS[index % FOLDER_ACCENTS.length],
      })),
    ],
    [folders, t]
  );

  const handleToggleType = (value: TypeFilterValue) => {
    setActiveTypes((prev) => {
      const next = new Set(prev);
      if (next.has(value)) next.delete(value);
      else next.add(value);
      return next;
    });
  };

  const handleLongPressFolder = (value: string) => {
    if (value === FOLDER_ALL || value === FOLDER_UNFILED) return;
    const folder = folders.find((f) => f.id === value);
    if (!folder) return;
    Alert.alert(t('history.deleteFolderTitle'), t('history.deleteFolderBody'), [
      { text: t('history.deleteFolderCancel'), style: 'cancel' },
      {
        text: t('history.deleteFolderDelete'),
        style: 'destructive',
        onPress: async () => {
          await deleteFolder(folder.id);
          await clearFolderFromEntries(folder.id);
          if (activeFolder === folder.id) setActiveFolder(FOLDER_ALL);
          reload();
        },
      },
    ]);
  };

  const handleCreateFolder = async () => {
    const name = newFolderName.trim();
    if (!name) return;
    const folder = await createFolder(name);
    setNewFolderName('');
    setIsCreateFolderOpen(false);
    setActiveFolder(folder.id);
    reload();
  };

  const handleAssignFolder = async (folderId: string | null) => {
    if (!assigningEntry) return;
    await setEntryFolder(assigningEntry.kind, assigningEntry.timestamp, folderId);
    setAssigningEntry(null);
    reload();
  };

  const addFolderPill = (
    <Pressable onPress={() => setIsCreateFolderOpen(true)} style={styles.addFolderPill}>
      <Ionicons name="add" size={14} color={colors.text} />
      <Text style={styles.addFolderPillText}>{t('history.newFolder')}</Text>
    </Pressable>
  );

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'left', 'right']}>
      <Text style={styles.title}>{t('history.title')}</Text>

      {entries.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyTitle}>{t('history.empty')}</Text>
          <Text style={styles.emptyBody}>{t('history.emptyBody')}</Text>
        </View>
      ) : (
        <>
          <View style={styles.filters}>
            <View style={styles.searchBar}>
              <Ionicons name="search" size={16} color={colors.text} style={styles.searchIcon} />
              <TextInput
                style={styles.searchInput}
                placeholder={t('history.searchPlaceholder')}
                placeholderTextColor={placeholderColor}
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
              {searchQuery.length > 0 ? (
                <Pressable onPress={() => setSearchQuery('')} hitSlop={8}>
                  <Ionicons name="close-circle" size={16} color={colors.text} style={styles.searchClear} />
                </Pressable>
              ) : null}
            </View>

            <FilterPillRow
              options={typeOptions}
              isSelected={(value) => activeTypes.has(value)}
              onPress={handleToggleType}
            />

            <FilterPillRow
              options={folderOptions}
              isSelected={(value) => activeFolder === value}
              onPress={setActiveFolder}
              onLongPress={handleLongPressFolder}
              trailing={addFolderPill}
            />
          </View>

          {filteredEntries.length === 0 ? (
            <View style={styles.empty}>
              <Text style={styles.emptyTitle}>{t('history.noResults')}</Text>
              <Text style={styles.emptyBody}>{t('history.noResultsBody')}</Text>
            </View>
          ) : (
            <FlatList
              data={filteredEntries}
              keyExtractor={(item) => `${item.kind}-${item.timestamp}`}
              contentContainerStyle={[styles.list, { paddingBottom: tabBarHeight + 20 }]}
              renderItem={({ item }) => {
                const name = item.kind === 'qr' ? item.data : (item.product?.productName ?? item.barcode);
                const metaKey = item.kind === 'qr' ? QR_META_KEY[item.contentType] : 'history.metaBarcode';
                const folder = item.folderId ? folders.find((f) => f.id === item.folderId) : undefined;
                const handlePress = () => {
                  captureAnalyticsEvent('history_entry_opened', {
                    kind: item.kind,
                    ...(item.kind === 'qr' ? { contentType: item.contentType } : { status: item.status }),
                  });
                  navigation.navigate('HistoryDetail', { entry: item });
                };
                return (
                  <Pressable
                    style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
                    onPress={handlePress}
                    onLongPress={() => setAssigningEntry(item)}
                  >
                    <View style={styles.rowText}>
                      <Text style={styles.name} numberOfLines={1}>
                        {name}
                      </Text>
                      <Text style={styles.meta}>
                        {new Date(item.timestamp).toLocaleString(undefined, {
                          dateStyle: 'medium',
                          timeStyle: 'short',
                        })}{' '}
                        · {t(metaKey)}
                        {folder ? ` · ${folder.name}` : ''}
                      </Text>
                    </View>
                    <HistoryStatusBadge entry={item} />
                  </Pressable>
                );
              }}
            />
          )}
        </>
      )}

      <BottomSheet
        visible={assigningEntry !== null}
        onClose={() => setAssigningEntry(null)}
        title={t('history.moveToFolder')}
      >
        <View style={styles.sheetList}>
          <FolderRow
            label={t('history.folderUnfiled')}
            selected={!assigningEntry?.folderId}
            onPress={() => handleAssignFolder(null)}
            styles={styles}
          />
          {folders.map((folder) => (
            <FolderRow
              key={folder.id}
              label={folder.name}
              selected={assigningEntry?.folderId === folder.id}
              onPress={() => handleAssignFolder(folder.id)}
              styles={styles}
            />
          ))}
        </View>
      </BottomSheet>

      <BottomSheet
        visible={isCreateFolderOpen}
        onClose={() => setIsCreateFolderOpen(false)}
        title={t('history.newFolder')}
      >
        <View style={styles.createFolderForm}>
          <TextInput
            style={styles.createFolderInput}
            placeholder={t('history.folderNamePlaceholder')}
            placeholderTextColor={placeholderColor}
            value={newFolderName}
            onChangeText={setNewFolderName}
            autoFocus
            onSubmitEditing={handleCreateFolder}
          />
          <Pressable
            onPress={handleCreateFolder}
            disabled={!newFolderName.trim()}
            style={[styles.createFolderButton, !newFolderName.trim() && styles.createFolderButtonDisabled]}
          >
            <Text style={styles.createFolderButtonText}>{t('history.createFolder')}</Text>
          </Pressable>
        </View>
      </BottomSheet>
    </SafeAreaView>
  );
}

type Styles = ReturnType<typeof createStyles>;

function FolderRow({
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
      style={({ pressed }) => [styles.folderRow, selected && styles.folderRowSelected, pressed && styles.rowPressed]}
    >
      <Text style={styles.name}>{label}</Text>
      {selected ? <Text style={styles.checkmark}>✓</Text> : null}
    </Pressable>
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
    empty: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      padding: 28,
      gap: 8,
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
    },
    filters: {
      paddingHorizontal: 20,
      gap: 10,
      marginBottom: 12,
    },
    searchBar: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      backgroundColor: colors.panel,
      borderWidth: 1,
      borderColor: colors.panelLine,
      borderRadius: 14,
      paddingHorizontal: 14,
      paddingVertical: 10,
    },
    searchIcon: {
      opacity: 0.55,
    },
    searchInput: {
      flex: 1,
      color: colors.text,
      fontSize: 14,
      padding: 0,
    },
    searchClear: {
      opacity: 0.5,
    },
    addFolderPill: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      borderWidth: 1,
      borderColor: colors.panelLine,
      borderRadius: 999,
      paddingHorizontal: 12,
      paddingVertical: 7,
    },
    addFolderPillText: {
      fontFamily: fonts.mono,
      fontSize: 11.5,
      letterSpacing: 0.3,
      color: colors.text,
      opacity: 0.75,
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
      padding: 14,
    },
    rowPressed: {
      opacity: 0.75,
    },
    rowText: {
      flex: 1,
    },
    name: {
      fontFamily: fonts.displayBold,
      fontSize: 14.5,
      color: colors.text,
    },
    meta: {
      fontFamily: fonts.mono,
      fontSize: 10.5,
      color: colors.text,
      opacity: 0.5,
      marginTop: 3,
    },
    sheetList: {
      gap: 10,
      paddingBottom: 6,
    },
    folderRow: {
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
    folderRowSelected: {
      borderColor: colors.mint,
    },
    checkmark: {
      fontSize: 16,
      color: colors.mint,
      fontFamily: fonts.displayBold,
    },
    createFolderForm: {
      gap: 12,
      paddingBottom: 6,
    },
    createFolderInput: {
      backgroundColor: colors.panel,
      borderWidth: 1,
      borderColor: colors.panelLine,
      borderRadius: 14,
      paddingHorizontal: 16,
      paddingVertical: 12,
      color: colors.text,
      fontSize: 14,
    },
    createFolderButton: {
      backgroundColor: colors.mint,
      borderRadius: 999,
      paddingVertical: 13,
      alignItems: 'center',
    },
    createFolderButtonDisabled: {
      opacity: 0.4,
    },
    createFolderButtonText: {
      fontFamily: fonts.displayBold,
      fontSize: 14,
      color: colors.inkOnCream,
    },
  });
}
