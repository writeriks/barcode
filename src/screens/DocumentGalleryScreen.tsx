import { Ionicons } from '@expo/vector-icons';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import { BlurView } from 'expo-blur';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Alert,
  FlatList,
  Image,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { BottomBannerAd } from '../components/BottomBannerAd';
import { PillButton } from '../components/PillButton';
import { isExpoGo } from '../services/ads/environment';
import { useThemeColors } from '../theme/ThemeContext';
import type { ColorTheme } from '../theme/colors';
import { fonts } from '../theme/fonts';

interface Props {
  imageUris: string[];
  /** Free users can only open/act on the first page — every other page
   * shows locked (blurred + PRO badge) until they upgrade. Deleting a
   * locked page is still allowed (see DocumentEntryScreen): whichever
   * page ends up at index 0 is always the unlocked one. */
  isPremium: boolean;
  onOpenPage: (index: number) => void;
  onOpenPaywall: () => void;
  onDeletePages: (indexes: number[]) => void;
  onScanAgain: () => void;
}

const NUM_COLUMNS = 2;
const GRID_GAP = 12;
const SCREEN_PADDING = 20;

export function DocumentGalleryScreen({
  imageUris,
  isPremium,
  onOpenPage,
  onOpenPaywall,
  onDeletePages,
  onScanAgain,
}: Props) {
  const { t } = useTranslation();
  const tabBarHeight = useBottomTabBarHeight();
  const { width: windowWidth } = useWindowDimensions();
  const colors = useThemeColors();
  const itemWidth = (windowWidth - SCREEN_PADDING * 2 - GRID_GAP * (NUM_COLUMNS - 1)) / NUM_COLUMNS;
  const styles = useMemo(() => createStyles(colors, itemWidth), [colors, itemWidth]);
  const [isEditMode, setIsEditMode] = useState(false);
  const [selectedIndexes, setSelectedIndexes] = useState<Set<number>>(new Set());

  const isLocked = (index: number) => !isPremium && index > 0;

  // Locked pages stay selectable so they can still be deleted, but sharing
  // one would hand a free user the full-resolution page the paywall is
  // meant to gate — so the whole selection has to be unlocked to share.
  const canShareSelection = selectedIndexes.size > 0 && ![...selectedIndexes].some(isLocked);

  const handleToggleEditMode = () => {
    setIsEditMode((prev) => !prev);
    setSelectedIndexes(new Set());
  };

  const handleToggleSelect = (index: number) => {
    setSelectedIndexes((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  };

  // Both JS sharing APIs (expo-sharing, RN's Share) take a single file, so
  // sharing several pages at once goes through the local native module's
  // UIActivityViewController wrapper instead. Same dynamic-import guard as
  // every other call into it — see ScannerScreen's handleScanDocument.
  const handleShareSelected = async () => {
    if (!canShareSelection) return;
    if (Platform.OS !== 'ios' || isExpoGo()) return;
    // Page order, not the order the user happened to tap them in.
    const uris = [...selectedIndexes]
      .sort((a, b) => a - b)
      .map((index) => imageUris[index])
      .filter(Boolean);
    if (uris.length === 0) return;
    const { shareFilesAsync } = await import('expo-document-scanner');
    await shareFilesAsync(uris);
  };

  const handleDeleteSelected = () => {
    if (selectedIndexes.size === 0) return;
    Alert.alert(t('document.deletePagesTitle'), t('document.deletePagesBody'), [
      { text: t('history.cancel'), style: 'cancel' },
      {
        text: t('history.delete'),
        style: 'destructive',
        onPress: () => {
          onDeletePages([...selectedIndexes]);
          setIsEditMode(false);
          setSelectedIndexes(new Set());
        },
      },
    ]);
  };

  return (
    <View style={[styles.screen, { paddingBottom: tabBarHeight }]}>
      <View style={styles.header}>
        <Text style={styles.title}>{t('document.galleryTitle', { count: imageUris.length })}</Text>
        <Pressable onPress={handleToggleEditMode} style={styles.editButton} hitSlop={8}>
          <Text style={styles.editButtonText}>{isEditMode ? t('history.done') : t('history.edit')}</Text>
        </Pressable>
      </View>

      <FlatList
        data={imageUris}
        keyExtractor={(uri, index) => `${uri}-${index}`}
        numColumns={NUM_COLUMNS}
        style={styles.flex}
        contentContainerStyle={[styles.grid, { paddingBottom: isEditMode ? 90 : 30 }]}
        columnWrapperStyle={styles.gridRow}
        renderItem={({ item, index }) => {
          const locked = isLocked(index);
          const selected = selectedIndexes.has(index);
          const handlePress = () => {
            if (isEditMode) {
              handleToggleSelect(index);
              return;
            }
            if (locked) {
              onOpenPaywall();
              return;
            }
            onOpenPage(index);
          };

          return (
            <Pressable style={styles.gridItem} onPress={handlePress}>
              <Image source={{ uri: item }} style={styles.gridImage} resizeMode="cover" />
              {locked ? (
                <BlurView intensity={35} tint="dark" style={StyleSheet.absoluteFill}>
                  <View style={styles.lockOverlay}>
                    <Ionicons name="lock-closed" size={18} color={colors.cream} />
                    <View style={styles.lockBadge}>
                      <Text style={styles.lockBadgeText}>PRO</Text>
                    </View>
                  </View>
                </BlurView>
              ) : null}
              {isEditMode ? (
                <View style={styles.gridCheckbox}>
                  <Ionicons
                    name={selected ? 'checkmark-circle' : 'ellipse-outline'}
                    size={22}
                    color={selected ? colors.mint : colors.cream}
                    style={!selected && styles.gridCheckboxDim}
                  />
                </View>
              ) : null}
            </Pressable>
          );
        }}
      />

      {!isEditMode ? <BottomBannerAd /> : null}

      <View style={[styles.floatingActionWrap, { bottom: tabBarHeight + 16 }]} pointerEvents="box-none">
        {isEditMode ? (
          <View style={styles.editActions}>
            <PillButton
              title={t('history.share')}
              onPress={handleShareSelected}
              variant="ghost"
              icon="share-outline"
              style={!canShareSelection && styles.disabledButton}
            />
            <PillButton
              title={t('history.delete')}
              onPress={handleDeleteSelected}
              variant="ghost"
              icon="trash-outline"
              style={selectedIndexes.size === 0 && styles.disabledButton}
            />
          </View>
        ) : (
          <PillButton title={t('document.scanAnother')} onPress={onScanAgain} variant="punch" />
        )}
      </View>
    </View>
  );
}

function createStyles(colors: ColorTheme, itemWidth: number) {
  const itemHeight = itemWidth * 1.3;
  return StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: colors.cabinet,
    },
    flex: {
      flex: 1,
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
      fontSize: 20,
      color: colors.text,
    },
    editButton: {
      paddingHorizontal: 10,
      paddingVertical: 6,
    },
    editButtonText: {
      fontFamily: fonts.displayBold,
      fontSize: 14,
      color: colors.mint,
    },
    grid: {
      paddingHorizontal: SCREEN_PADDING,
      gap: GRID_GAP,
    },
    gridRow: {
      gap: GRID_GAP,
    },
    gridItem: {
      width: itemWidth,
      height: itemHeight,
    },
    gridImage: {
      width: '100%',
      height: '100%',
      borderRadius: 14,
      backgroundColor: colors.cream,
      borderWidth: 2,
      borderColor: colors.mint,
    },
    lockOverlay: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      borderRadius: 14,
      overflow: 'hidden',
    },
    lockBadge: {
      backgroundColor: colors.citrus,
      borderRadius: 999,
      paddingHorizontal: 10,
      paddingVertical: 3,
    },
    lockBadgeText: {
      fontFamily: fonts.displayBold,
      fontSize: 10,
      letterSpacing: 0.5,
      color: colors.inkOnCream,
    },
    gridCheckbox: {
      position: 'absolute',
      top: 8,
      right: 8,
    },
    gridCheckboxDim: {
      opacity: 0.7,
    },
    floatingActionWrap: {
      position: 'absolute',
      left: 24,
      right: 24,
      alignItems: 'center',
    },
    editActions: {
      flexDirection: 'row',
      gap: 10,
    },
    disabledButton: {
      opacity: 0.4,
    },
  });
}
