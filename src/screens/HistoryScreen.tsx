import { Ionicons } from '@expo/vector-icons';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, FlatList, Platform, Pressable, Share, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BottomBannerAd } from '../components/BottomBannerAd';
import { BottomSheet } from '../components/BottomSheet';
import { FilterPillRow, type PillAccent, type PillOption } from '../components/FilterPillRow';
import { HistoryStatusBadge } from '../components/HistoryStatusBadge';
import { PromptModal } from '../components/PromptModal';
import { usePremium } from '../premium/PremiumContext';
import { isExpoGo } from '../services/ads/environment';
import { captureAnalyticsEvent } from '../services/analytics';
import { createFolder, deleteFolder, getFolders } from '../services/historyFolders';
import { shareHistoryEntriesAsCsv } from '../services/historyExport';
import {
  clearFolderFromEntries,
  deleteHistoryEntries,
  FREE_MAX_ENTRIES,
  getHistory,
  renameHistoryEntry,
  setEntriesFolder,
  type HistoryEntryKey,
} from '../services/scanHistory';
import { useThemeColors, useThemeMode } from '../theme/ThemeContext';
import type { ColorTheme } from '../theme/colors';
import { fonts } from '../theme/fonts';
import type { HistoryStackParamList, RootTabParamList } from '../navigation/types';
import type { ScanHistoryEntry } from '../types/history';
import type { HistoryFolder } from '../types/historyFolder';
import type { QrContentType } from '../utils/classifyQrContent';

type Props = NativeStackScreenProps<HistoryStackParamList, 'HistoryList'>;

type TypeFilterValue = 'barcode' | 'document' | QrContentType;

const FOLDER_ALL = 'all';
const FOLDER_UNFILED = 'unfiled';
const FOLDER_ACCENTS: PillAccent[] = ['punch', 'citrus', 'mint', 'coral'];

const QR_META_KEY: Record<QrContentType, string> = {
  link: 'history.metaQrLink',
  email: 'history.metaQrEmail',
  phone: 'history.metaQrPhone',
  sms: 'history.metaQrSms',
  whatsapp: 'history.metaQrWhatsapp',
  zoom: 'history.metaQrZoom',
  wifi: 'history.metaQrWifi',
  vcard: 'history.metaQrVcard',
  event: 'history.metaQrEvent',
  otp: 'history.metaQrOtp',
  text: 'history.metaQrText',
  facebook: 'history.metaQrFacebook',
  instagram: 'history.metaQrInstagram',
  twitter: 'history.metaQrTwitter',
  spotify: 'history.metaQrSpotify',
  viber: 'history.metaQrViber',
  location: 'history.metaQrLocation',
  mecard: 'history.metaQrMecard',
  upi: 'history.metaQrUpi',
  paypal: 'history.metaQrPaypal',
  linkedin: 'history.metaQrLinkedin',
};

const TYPE_FILTER_OPTIONS: { value: TypeFilterValue; labelKey: string; accent: PillAccent }[] = [
  { value: 'barcode', labelKey: 'history.metaBarcode', accent: 'punch' },
  { value: 'link', labelKey: 'qr.typeLink', accent: 'mint' },
  { value: 'email', labelKey: 'qr.typeEmail', accent: 'citrus' },
  { value: 'phone', labelKey: 'qr.typePhone', accent: 'coral' },
  { value: 'sms', labelKey: 'qr.typeSms', accent: 'coral' },
  { value: 'whatsapp', labelKey: 'qr.typeWhatsapp', accent: 'mint' },
  { value: 'zoom', labelKey: 'qr.typeZoom', accent: 'citrus' },
  { value: 'wifi', labelKey: 'qr.typeWifi', accent: 'mint' },
  { value: 'vcard', labelKey: 'qr.typeVcard', accent: 'citrus' },
  { value: 'event', labelKey: 'qr.typeEvent', accent: 'coral' },
  { value: 'otp', labelKey: 'qr.typeOtp', accent: 'punch' },
  { value: 'text', labelKey: 'qr.typeText', accent: 'mint' },
  { value: 'facebook', labelKey: 'qr.typeFacebook', accent: 'mint' },
  { value: 'instagram', labelKey: 'qr.typeInstagram', accent: 'coral' },
  { value: 'twitter', labelKey: 'qr.typeTwitter', accent: 'mint' },
  { value: 'spotify', labelKey: 'qr.typeSpotify', accent: 'citrus' },
  { value: 'viber', labelKey: 'qr.typeViber', accent: 'coral' },
  { value: 'location', labelKey: 'qr.typeLocation', accent: 'mint' },
  { value: 'mecard', labelKey: 'qr.typeMecard', accent: 'citrus' },
  { value: 'upi', labelKey: 'qr.typeUpi', accent: 'coral' },
  { value: 'paypal', labelKey: 'qr.typePaypal', accent: 'mint' },
  { value: 'linkedin', labelKey: 'qr.typeLinkedin', accent: 'citrus' },
  { value: 'document', labelKey: 'document.typeDocument', accent: 'citrus' },
];

function entryKey(entry: ScanHistoryEntry): string {
  return `${entry.kind}-${entry.timestamp}`;
}

function entryTypeValue(entry: ScanHistoryEntry): TypeFilterValue {
  if (entry.kind === 'product') return 'barcode';
  if (entry.kind === 'document') return 'document';
  return entry.contentType;
}

/** What the list calls this entry: whatever the user renamed it to, or
 * else a name derived from the scan itself. */
function entryDisplayName(entry: ScanHistoryEntry, t: (key: string) => string): string {
  if (entry.label) return entry.label;
  if (entry.kind === 'qr') return entry.data;
  if (entry.kind === 'document') {
    return entry.pageTexts.find((text) => text.trim().length > 0) || t('document.noTextFound');
  }
  return entry.product?.productName ?? entry.barcode;
}

function matchesSearch(entry: ScanHistoryEntry, query: string): boolean {
  // A renamed entry has to stay findable by the name the user gave it,
  // not only by whatever it was scanned as.
  if (entry.label?.toLowerCase().includes(query)) return true;
  if (entry.kind === 'qr') return entry.data.toLowerCase().includes(query);
  if (entry.kind === 'document') return entry.pageTexts.some((text) => text.toLowerCase().includes(query));
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
  const { isPremium, openPaywall } = usePremium();

  const [entries, setEntries] = useState<ScanHistoryEntry[]>([]);
  const [folders, setFolders] = useState<HistoryFolder[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTypes, setActiveTypes] = useState<Set<TypeFilterValue>>(new Set());
  const [activeFolder, setActiveFolder] = useState<string>(FOLDER_ALL);
  const [isAddMenuOpen, setIsAddMenuOpen] = useState(false);
  const [isCreateFolderOpen, setIsCreateFolderOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [assigningKeys, setAssigningKeys] = useState<HistoryEntryKey[] | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set());
  const [menuEntry, setMenuEntry] = useState<ScanHistoryEntry | null>(null);
  const [renamingEntry, setRenamingEntry] = useState<ScanHistoryEntry | null>(null);
  const [renameValue, setRenameValue] = useState('');

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

  // Only offer a type as a filter once something of that type has actually
  // been scanned/saved — a pill for a type with zero entries would just be
  // dead weight in the row.
  const availableTypes = useMemo(() => {
    const set = new Set<TypeFilterValue>();
    entries.forEach((entry) => set.add(entryTypeValue(entry)));
    return set;
  }, [entries]);

  const typeOptions: PillOption<TypeFilterValue>[] = useMemo(
    () =>
      TYPE_FILTER_OPTIONS.filter((option) => availableTypes.has(option.value)).map((option) => ({
        value: option.value,
        label: t(option.labelKey),
        accent: option.accent,
      })),
    [t, availableTypes]
  );

  // Drop a selected filter the moment its last matching entry disappears
  // (deleted, moved out, etc.) — otherwise it stays "active" with no pill
  // left to tap to clear it.
  useEffect(() => {
    setActiveTypes((prev) => {
      const next = new Set([...prev].filter((value) => availableTypes.has(value)));
      return next.size === prev.size ? prev : next;
    });
  }, [availableTypes]);

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

  // Only meaningful when assigningKeys has exactly one entry (opened via a
  // single row's long-press) — with a bulk selection there's no single
  // "current folder" to highlight in the sheet.
  const assigningSingleEntry = useMemo(() => {
    if (assigningKeys?.length !== 1) return undefined;
    const [key] = assigningKeys;
    return entries.find((entry) => entry.kind === key.kind && entry.timestamp === key.timestamp);
  }, [assigningKeys, entries]);

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

  const handleNewScan = () => {
    setIsAddMenuOpen(false);
    navigation.getParent<BottomTabNavigationProp<RootTabParamList>>()?.navigate('Scanner');
  };

  const handleOpenCreateFolder = () => {
    setIsAddMenuOpen(false);
    setIsCreateFolderOpen(true);
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
    if (!assigningKeys) return;
    await setEntriesFolder(assigningKeys, folderId);
    setAssigningKeys(null);
    setSelectedKeys(new Set());
    reload();
  };

  const handleDeleteAssigning = () => {
    if (!assigningKeys) return;
    const keys = assigningKeys;
    Alert.alert(t('history.deleteEntryTitle'), t('history.deleteEntryBody'), [
      { text: t('history.cancel'), style: 'cancel' },
      {
        text: t('history.delete'),
        style: 'destructive',
        onPress: async () => {
          await deleteHistoryEntries(keys);
          setAssigningKeys(null);
          setSelectedKeys(new Set());
          reload();
        },
      },
    ]);
  };

  const handleRenameMenuEntry = () => {
    if (!menuEntry) return;
    const entry = menuEntry;
    setMenuEntry(null);
    // Seeded with the current custom name only — an entry that's never
    // been renamed opens empty rather than pre-filling a whole QR URL or
    // a paragraph of OCR text for the user to delete first.
    setRenameValue(entry.label ?? '');
    setRenamingEntry(entry);
  };

  const handleSubmitRename = async () => {
    const name = renameValue.trim();
    // The submit button is already disabled while empty, but the input's
    // return key isn't — same guard as handleCreateFolder.
    if (!renamingEntry || !name) return;
    await renameHistoryEntry({ kind: renamingEntry.kind, timestamp: renamingEntry.timestamp }, name);
    setRenamingEntry(null);
    setRenameValue('');
    reload();
  };

  const handleMoveMenuEntry = () => {
    if (!menuEntry) return;
    setAssigningKeys([{ kind: menuEntry.kind, timestamp: menuEntry.timestamp }]);
    setMenuEntry(null);
  };

  const handleShareMenuEntry = () => {
    if (!menuEntry) return;
    const entry = menuEntry;
    captureAnalyticsEvent('history_entry_shared', { kind: entry.kind });
    setMenuEntry(null);
    // BottomSheet is a native Modal — presenting the share sheet in the
    // same tick as dismissing it races the two native presentations and
    // the share sheet silently never appears. Deferring past the
    // dismissal (a plain setTimeout since Modal's onDismiss is iOS-only,
    // and this app also ships on Android) fixes it.
    setTimeout(async () => {
      // A document shares as its pages, not as its OCR text — the same
      // rule as everywhere else. Falls back to plain text sharing if the
      // native module isn't there to take an array of files.
      if (entry.kind === 'document') {
        if (Platform.OS !== 'ios' || isExpoGo()) return;
        const { shareFilesAsync } = await import('expo-document-scanner');
        await shareFilesAsync(entry.imageUris);
        return;
      }
      Share.share({ message: entry.kind === 'qr' ? entry.data : entry.barcode });
    }, 300);
  };

  const handleDeleteMenuEntry = () => {
    if (!menuEntry) return;
    const key = { kind: menuEntry.kind, timestamp: menuEntry.timestamp };
    setMenuEntry(null);
    Alert.alert(t('history.deleteEntryTitle'), t('history.deleteEntryBody'), [
      { text: t('history.cancel'), style: 'cancel' },
      {
        text: t('history.delete'),
        style: 'destructive',
        onPress: async () => {
          await deleteHistoryEntries([key]);
          reload();
        },
      },
    ]);
  };

  const handleToggleEditMode = () => {
    setIsEditMode((prev) => !prev);
    setSelectedKeys(new Set());
  };

  const handleToggleSelected = (item: ScanHistoryEntry) => {
    const key = entryKey(item);
    setSelectedKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const selectedEntries = useMemo(
    () => entries.filter((entry) => selectedKeys.has(entryKey(entry))),
    [entries, selectedKeys]
  );

  const handleBulkMove = () => {
    if (selectedEntries.length === 0) return;
    setAssigningKeys(selectedEntries.map((entry) => ({ kind: entry.kind, timestamp: entry.timestamp })));
  };

  const handleBulkShare = () => {
    if (selectedEntries.length === 0) return;
    shareHistoryEntriesAsCsv(selectedEntries);
  };

  const handleBulkDelete = () => {
    if (selectedEntries.length === 0) return;
    const keys = selectedEntries.map((entry) => ({ kind: entry.kind, timestamp: entry.timestamp }));
    Alert.alert(t('history.deleteSelectedTitle'), t('history.deleteEntryBody'), [
      { text: t('history.cancel'), style: 'cancel' },
      {
        text: t('history.delete'),
        style: 'destructive',
        onPress: async () => {
          await deleteHistoryEntries(keys);
          setSelectedKeys(new Set());
          reload();
        },
      },
    ]);
  };

  const hasSelection = selectedKeys.size > 0;

  return (
    <SafeAreaView style={[styles.screen, { paddingBottom: tabBarHeight }]} edges={['top', 'left', 'right']}>
      <View style={styles.headerRow}>
        <Pressable onPress={() => setIsAddMenuOpen(true)} style={styles.iconButton} hitSlop={8}>
          <Ionicons name="add" size={20} color={colors.text} />
        </Pressable>
        {entries.length > 0 ? (
          <Pressable onPress={handleToggleEditMode} style={styles.editButton} hitSlop={8}>
            <Text style={styles.editButtonText}>{isEditMode ? t('history.done') : t('history.edit')}</Text>
          </Pressable>
        ) : null}
      </View>
      <Text style={styles.title}>{t('history.title')}</Text>
      {isEditMode ? (
        <Text style={styles.selectedCount}>{t('history.selectedCount', { count: selectedKeys.size })}</Text>
      ) : null}

      {!isPremium && entries.length >= FREE_MAX_ENTRIES ? (
        <Pressable onPress={openPaywall} style={styles.upgradeBanner}>
          <Ionicons name="sparkles" size={14} color={colors.citrus} />
          <Text style={styles.upgradeBannerText}>{t('history.freeLimitReached', { count: FREE_MAX_ENTRIES })}</Text>
          <Ionicons name="chevron-forward" size={14} color={colors.text} style={styles.upgradeBannerChevron} />
        </Pressable>
      ) : null}

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
              keyExtractor={entryKey}
              style={styles.flex}
              contentContainerStyle={[styles.list, { paddingBottom: isEditMode ? 90 : 20 }]}
              renderItem={({ item }) => {
                const name = entryDisplayName(item, t);
                const metaKey =
                  item.kind === 'qr'
                    ? QR_META_KEY[item.contentType]
                    : item.kind === 'document'
                      ? 'document.metaDocument'
                      : 'history.metaBarcode';
                const folder = item.folderId ? folders.find((f) => f.id === item.folderId) : undefined;
                const selected = selectedKeys.has(entryKey(item));
                const handlePress = () => {
                  if (isEditMode) {
                    handleToggleSelected(item);
                    return;
                  }
                  captureAnalyticsEvent('history_entry_opened', {
                    kind: item.kind,
                    ...(item.kind === 'qr'
                      ? { contentType: item.contentType }
                      : item.kind === 'product'
                        ? { status: item.status }
                        : {}),
                  });
                  navigation.navigate('HistoryDetail', { entry: item });
                };
                return (
                  <Pressable
                    style={({ pressed }) => [
                      styles.row,
                      selected && styles.rowSelected,
                      pressed && styles.rowPressed,
                    ]}
                    onPress={handlePress}
                    onLongPress={() => !isEditMode && setMenuEntry(item)}
                  >
                    {isEditMode ? (
                      <Ionicons
                        name={selected ? 'checkmark-circle' : 'ellipse-outline'}
                        size={22}
                        color={selected ? colors.mint : colors.text}
                        style={!selected && styles.checkboxDim}
                      />
                    ) : null}
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
                    {!isEditMode ? (
                      <Pressable onPress={() => setMenuEntry(item)} hitSlop={10} style={styles.rowMenuButton}>
                        <Ionicons name="ellipsis-vertical" size={16} color={colors.text} style={styles.rowMenuIcon} />
                      </Pressable>
                    ) : null}
                  </Pressable>
                );
              }}
            />
          )}
        </>
      )}

      {!isEditMode ? <BottomBannerAd /> : null}

      {isEditMode ? (
        <View style={[styles.bulkToolbarWrap, { bottom: tabBarHeight + 16 }]} pointerEvents="box-none">
          <View style={styles.bulkToolbar}>
            <BulkButton
              icon="folder-outline"
              label={t('history.move')}
              disabled={!hasSelection}
              onPress={handleBulkMove}
              styles={styles}
              colors={colors}
            />
            <BulkButton
              icon="share-outline"
              label={t('history.share')}
              disabled={!hasSelection}
              onPress={handleBulkShare}
              styles={styles}
              colors={colors}
            />
            <BulkButton
              icon="trash-outline"
              label={t('history.delete')}
              disabled={!hasSelection}
              onPress={handleBulkDelete}
              styles={styles}
              colors={colors}
              destructive
            />
          </View>
        </View>
      ) : null}

      <BottomSheet visible={isAddMenuOpen} onClose={() => setIsAddMenuOpen(false)} title={t('history.addTitle')}>
        <View style={styles.sheetList}>
          <Pressable
            onPress={handleNewScan}
            style={({ pressed }) => [styles.menuRow, pressed && styles.rowPressed]}
          >
            <Ionicons name="scan-outline" size={18} color={colors.mint} />
            <Text style={styles.menuRowText}>{t('history.newScan')}</Text>
          </Pressable>
          <Pressable
            onPress={handleOpenCreateFolder}
            style={({ pressed }) => [styles.menuRow, pressed && styles.rowPressed]}
          >
            <Ionicons name="folder-outline" size={18} color={colors.citrusText} />
            <Text style={styles.menuRowText}>{t('history.newFolder')}</Text>
          </Pressable>
        </View>
      </BottomSheet>

      <BottomSheet
        visible={assigningKeys !== null}
        onClose={() => setAssigningKeys(null)}
        title={t('history.moveToFolder')}
      >
        <View style={styles.sheetList}>
          <FolderRow
            label={t('history.folderUnfiled')}
            selected={assigningSingleEntry ? !assigningSingleEntry.folderId : false}
            onPress={() => handleAssignFolder(null)}
            styles={styles}
          />
          {folders.map((folder) => (
            <FolderRow
              key={folder.id}
              label={folder.name}
              selected={assigningSingleEntry?.folderId === folder.id}
              onPress={() => handleAssignFolder(folder.id)}
              styles={styles}
            />
          ))}
        </View>

        <Pressable
          onPress={handleDeleteAssigning}
          style={({ pressed }) => [styles.deleteEntryRow, pressed && styles.rowPressed]}
        >
          <Ionicons name="trash-outline" size={16} color={colors.coralText} />
          <Text style={styles.deleteEntryText}>{t('history.deleteEntry')}</Text>
        </Pressable>
      </BottomSheet>

      <BottomSheet visible={menuEntry !== null} onClose={() => setMenuEntry(null)} title={t('history.entryOptionsTitle')}>
        <View style={styles.sheetList}>
          <Pressable onPress={handleRenameMenuEntry} style={({ pressed }) => [styles.menuRow, pressed && styles.rowPressed]}>
            <Ionicons name="create-outline" size={18} color={colors.punch} />
            <Text style={styles.menuRowText}>{t('history.rename')}</Text>
          </Pressable>
          <Pressable onPress={handleMoveMenuEntry} style={({ pressed }) => [styles.menuRow, pressed && styles.rowPressed]}>
            <Ionicons name="folder-outline" size={18} color={colors.mint} />
            <Text style={styles.menuRowText}>{t('history.move')}</Text>
          </Pressable>
          <Pressable onPress={handleShareMenuEntry} style={({ pressed }) => [styles.menuRow, pressed && styles.rowPressed]}>
            <Ionicons name="share-outline" size={18} color={colors.citrusText} />
            <Text style={styles.menuRowText}>{t('history.share')}</Text>
          </Pressable>
          <Pressable
            onPress={handleDeleteMenuEntry}
            style={({ pressed }) => [styles.menuRow, pressed && styles.rowPressed]}
          >
            <Ionicons name="trash-outline" size={18} color={colors.coralText} />
            <Text style={[styles.menuRowText, styles.menuRowTextDestructive]}>{t('history.delete')}</Text>
          </Pressable>
        </View>
      </BottomSheet>

      <PromptModal
        visible={isCreateFolderOpen}
        onClose={() => setIsCreateFolderOpen(false)}
        title={t('history.newFolder')}
        placeholder={t('history.folderNamePlaceholder')}
        value={newFolderName}
        onChangeText={setNewFolderName}
        onSubmit={handleCreateFolder}
        submitLabel={t('history.createFolder')}
        cancelLabel={t('history.cancel')}
      />

      <PromptModal
        visible={renamingEntry !== null}
        onClose={() => setRenamingEntry(null)}
        title={t('history.rename')}
        placeholder={t('history.renamePlaceholder')}
        value={renameValue}
        onChangeText={setRenameValue}
        onSubmit={handleSubmitRename}
        submitLabel={t('history.renameSave')}
        cancelLabel={t('history.cancel')}
      />
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

function BulkButton({
  icon,
  label,
  disabled,
  onPress,
  styles,
  colors,
  destructive,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  disabled: boolean;
  onPress: () => void;
  styles: Styles;
  colors: ColorTheme;
  destructive?: boolean;
}) {
  return (
    <Pressable onPress={onPress} disabled={disabled} style={styles.bulkButton}>
      <Ionicons
        name={icon}
        size={17}
        color={destructive ? colors.coralText : colors.text}
        style={disabled && styles.bulkButtonDisabled}
      />
      <Text
        style={[
          styles.bulkButtonText,
          destructive && styles.bulkButtonTextDestructive,
          disabled && styles.bulkButtonDisabled,
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

function createStyles(colors: ColorTheme) {
  return StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: colors.cabinet,
    },
    flex: {
      flex: 1,
    },
    headerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 20,
      paddingTop: 20,
    },
    iconButton: {
      width: 36,
      height: 36,
      borderRadius: 18,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.panel,
      borderWidth: 1,
      borderColor: colors.panelLine,
    },
    editButton: {
      paddingHorizontal: 14,
      paddingVertical: 8,
    },
    editButtonText: {
      fontFamily: fonts.displayBold,
      fontSize: 14,
      color: colors.mint,
    },
    title: {
      fontFamily: fonts.displayBold,
      fontSize: 22,
      color: colors.text,
      paddingHorizontal: 20,
      paddingTop: 4,
      paddingBottom: 8,
    },
    selectedCount: {
      fontSize: 12.5,
      color: colors.text,
      opacity: 0.6,
      paddingHorizontal: 20,
      marginTop: -4,
      marginBottom: 8,
    },
    upgradeBanner: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginHorizontal: 20,
      marginBottom: 12,
      backgroundColor: 'rgba(255,210,63,0.12)',
      borderWidth: 1,
      borderColor: 'rgba(255,210,63,0.35)',
      borderRadius: 14,
      paddingHorizontal: 14,
      paddingVertical: 10,
    },
    upgradeBannerText: {
      flex: 1,
      fontSize: 12.5,
      color: colors.text,
    },
    upgradeBannerChevron: {
      opacity: 0.6,
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
    rowSelected: {
      borderColor: colors.mint,
    },
    rowPressed: {
      opacity: 0.75,
    },
    checkboxDim: {
      opacity: 0.4,
    },
    rowMenuButton: {
      padding: 4,
    },
    rowMenuIcon: {
      opacity: 0.5,
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
    bulkToolbarWrap: {
      position: 'absolute',
      left: 16,
      right: 16,
      alignItems: 'center',
    },
    bulkToolbar: {
      flexDirection: 'row',
      width: '100%',
      backgroundColor: colors.panel,
      borderWidth: 1,
      borderColor: colors.panelLine,
      borderRadius: 20,
      paddingVertical: 10,
    },
    bulkButton: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 3,
    },
    bulkButtonText: {
      fontFamily: fonts.displayBold,
      fontSize: 11.5,
      color: colors.text,
    },
    bulkButtonTextDestructive: {
      color: colors.coralText,
    },
    bulkButtonDisabled: {
      opacity: 0.35,
    },
    sheetList: {
      gap: 10,
      paddingBottom: 6,
    },
    menuRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      backgroundColor: colors.panel,
      borderWidth: 1,
      borderColor: colors.panelLine,
      borderRadius: 16,
      paddingHorizontal: 16,
      paddingVertical: 14,
    },
    menuRowText: {
      fontFamily: fonts.displayBold,
      fontSize: 14.5,
      color: colors.text,
    },
    menuRowTextDestructive: {
      color: colors.coralText,
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
    deleteEntryRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      marginTop: 14,
      paddingVertical: 13,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: 'rgba(255,90,90,0.35)',
    },
    deleteEntryText: {
      fontFamily: fonts.displayBold,
      fontSize: 14,
      color: colors.coralText,
    },
  });
}
