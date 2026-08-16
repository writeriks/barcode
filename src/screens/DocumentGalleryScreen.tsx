import { Ionicons } from '@expo/vector-icons';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
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
  onOpenPage: (index: number) => void;
  onDeletePages: (indexes: number[]) => void;
  onScanAgain: () => void;
}

const NUM_COLUMNS = 2;
const GRID_GAP = 12;
const SCREEN_PADDING = 20;

export function DocumentGalleryScreen({ imageUris, onOpenPage, onDeletePages, onScanAgain }: Props) {
  const { t } = useTranslation();
  const tabBarHeight = useBottomTabBarHeight();
  const { width: windowWidth } = useWindowDimensions();
  const colors = useThemeColors();
  const itemWidth = (windowWidth - SCREEN_PADDING * 2 - GRID_GAP * (NUM_COLUMNS - 1)) / NUM_COLUMNS;
  const styles = useMemo(() => createStyles(colors, itemWidth), [colors, itemWidth]);
  const [isEditMode, setIsEditMode] = useState(false);
  const [selectedIndexes, setSelectedIndexes] = useState<Set<number>>(new Set());

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
    if (selectedIndexes.size === 0) return;
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
        contentContainerStyle={styles.grid}
        columnWrapperStyle={styles.gridRow}
        renderItem={({ item, index }) => {
          const selected = selectedIndexes.has(index);
          const handlePress = () => {
            if (isEditMode) {
              handleToggleSelect(index);
              return;
            }
            onOpenPage(index);
          };

          return (
            <Pressable style={styles.gridItem} onPress={handlePress}>
              <Image source={{ uri: item }} style={styles.gridImage} resizeMode="cover" />
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

      {/* Laid out above the banner rather than floated over the grid: an
          absolutely-positioned button here landed on top of the ad, which
          AdMob counts as obscuring an impression. In normal flow the two
          can't collide however tall the banner turns out to be — or
          whether it renders at all (premium, no fill, Expo Go). */}
      <View style={styles.actionBar}>
        {isEditMode ? (
          <View style={styles.editActions}>
            <PillButton
              title={t('history.share')}
              onPress={handleShareSelected}
              variant="ghost"
              icon="share-outline"
              style={selectedIndexes.size === 0 && styles.disabledButton}
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

      {!isEditMode ? <BottomBannerAd /> : null}
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
    gridCheckbox: {
      position: 'absolute',
      top: 8,
      right: 8,
    },
    gridCheckboxDim: {
      opacity: 0.7,
    },
    actionBar: {
      alignItems: 'center',
      paddingHorizontal: 24,
      paddingTop: 12,
      paddingBottom: 14,
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
