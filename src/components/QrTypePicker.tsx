import { Ionicons } from '@expo/vector-icons';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { usePremium } from '../premium/PremiumContext';
import { useThemeColors } from '../theme/ThemeContext';
import type { ColorTheme } from '../theme/colors';
import type { QrContentType } from '../utils/classifyQrContent';
import { QR_PREMIUM_TYPES, QR_TYPE_CATEGORIES, QR_TYPE_ICON, QR_TYPE_LABEL_KEY } from '../utils/qrTypeMeta';
import { fonts } from '../theme/fonts';

interface Props {
  value: QrContentType;
  onChange: (type: QrContentType) => void;
}

/** The generator's type chooser: a labelled grid rather than the single
 * scrolling row it used to be. Twenty-seven types in a horizontal strip
 * showed four at a time and gave no hint the rest existed — grouped tiles
 * make the catalogue readable at a glance, which is most of what it's
 * for.
 *
 * A locked tile opens the paywall instead of switching to that type —
 * same pattern as Settings' premium-gated toggles. */
export function QrTypePicker({ value, onChange }: Props) {
  const { t } = useTranslation();
  const colors = useThemeColors();
  const { isPremium, openPaywall } = usePremium();
  const styles = useMemo(() => createStyles(colors), [colors]);
  // Measured rather than a percentage: the tiles sit inside a gap, and a
  // percentage width can't subtract pixels, so three 33% tiles plus two
  // gaps overflow the row and wrap to two per line.
  const [gridWidth, setGridWidth] = useState(0);
  // Floor so three tiles plus gaps never overflow by a subpixel and wrap
  // the last tile onto the next line, which reads as a left-shifted grid.
  const tileWidth =
    gridWidth > 0 ? Math.floor((gridWidth - GRID_GAP * (COLUMNS - 1)) / COLUMNS) : undefined;

  return (
    <View style={styles.wrap}>
      {QR_TYPE_CATEGORIES.map((category) => (
        <View key={category.labelKey} style={styles.category}>
          <Text style={styles.categoryLabel}>{t(category.labelKey)}</Text>
          <View
            style={styles.grid}
            onLayout={(event) => {
              const nextWidth = event.nativeEvent.layout.width;
              setGridWidth((current) => (current === nextWidth ? current : nextWidth));
            }}
          >
            {category.types.map((type) => {
              const selected = value === type;
              const locked = QR_PREMIUM_TYPES.has(type) && !isPremium;
              return (
                <Pressable
                  key={type}
                  onPress={() => (locked ? openPaywall('qrTypes') : onChange(type))}
                  style={({ pressed }) => [
                    styles.tile,
                    { width: tileWidth },
                    selected && styles.tileSelected,
                    pressed && styles.tilePressed,
                  ]}
                >
                  <Ionicons
                    name={QR_TYPE_ICON[type]}
                    size={21}
                    color={selected ? colors.cream : colors.mint}
                  />
                  <Text style={[styles.tileLabel, selected && styles.tileLabelSelected]} numberOfLines={2}>
                    {t(QR_TYPE_LABEL_KEY[type])}
                  </Text>
                  {locked ? (
                    <View style={styles.lockBadge}>
                      <Ionicons name="lock-closed" size={9} color={colors.inkOnCream} />
                    </View>
                  ) : null}
                </Pressable>
              );
            })}
          </View>
        </View>
      ))}
    </View>
  );
}

const COLUMNS = 3;
const GRID_GAP = 9;

function createStyles(colors: ColorTheme) {
  return StyleSheet.create({
    wrap: {
      width: '100%',
      gap: 18,
    },
    category: {
      width: '100%',
      gap: 9,
    },
    categoryLabel: {
      fontFamily: fonts.displayBold,
      fontSize: 10.5,
      letterSpacing: 0.9,
      textTransform: 'uppercase',
      color: colors.text,
      opacity: 0.5,
    },
    grid: {
      width: '100%',
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'center',
      gap: GRID_GAP,
    },
    tile: {
      // Width comes from the measured row — see tileWidth above.
      alignItems: 'center',
      justifyContent: 'center',
      gap: 7,
      minHeight: 84,
      paddingHorizontal: 6,
      paddingVertical: 13,
      backgroundColor: colors.panel,
      borderWidth: 1,
      borderColor: colors.panelLine,
      borderRadius: 15,
    },
    tileSelected: {
      backgroundColor: colors.punch,
      borderColor: colors.punch,
    },
    tilePressed: {
      opacity: 0.75,
    },
    tileLabel: {
      fontSize: 10.5,
      lineHeight: 13.5,
      textAlign: 'center',
      color: colors.text,
      opacity: 0.92,
    },
    tileLabelSelected: {
      color: colors.cream,
      opacity: 1,
    },
    lockBadge: {
      position: 'absolute',
      top: 7,
      right: 7,
      width: 15,
      height: 15,
      borderRadius: 8,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.citrus,
    },
  });
}
