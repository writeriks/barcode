import type { ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, Text } from 'react-native';
import { useThemeColors } from '../theme/ThemeContext';
import { accentTextColor, type PillAccent } from '../theme/accents';
import { fonts } from '../theme/fonts';

export type { PillAccent };

export interface PillOption<T extends string> {
  value: T;
  label: string;
  accent: PillAccent;
}

interface Props<T extends string> {
  options: PillOption<T>[];
  isSelected: (value: T) => boolean;
  onPress: (value: T) => void;
  onLongPress?: (value: T) => void;
  /** One more item appended inside the same scrollable row, e.g. an
   * "add folder" pill — kept out of `options` since it isn't a filter. */
  trailing?: ReactNode;
}

const TINT_RGB: Record<PillAccent, string> = {
  punch: '255,62,127',
  citrus: '255,210,63',
  mint: '47,230,184',
  coral: '255,90,90',
};

/** A horizontally-scrolling row of toggleable pills, each tinted in its own
 * accent color so the row reads as colorful chips rather than a flat list —
 * used for both the History type filters and the folder filters. */
export function FilterPillRow<T extends string>({ options, isSelected, onPress, onLongPress, trailing }: Props<T>) {
  const colors = useThemeColors();

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
      {options.map((option) => {
        const selected = isSelected(option.value);
        const tint = TINT_RGB[option.accent];
        const textColor = accentTextColor(colors, option.accent);
        return (
          <Pressable
            key={option.value}
            onPress={() => onPress(option.value)}
            onLongPress={onLongPress ? () => onLongPress(option.value) : undefined}
            style={[
              styles.pill,
              {
                borderColor: `rgba(${tint},${selected ? 0.55 : 0.28})`,
                backgroundColor: selected ? `rgba(${tint},0.16)` : colors.panel,
              },
            ]}
          >
            <Text style={[styles.label, { color: textColor, opacity: selected ? 1 : 0.65 }]}>{option.label}</Text>
          </Pressable>
        );
      })}
      {trailing}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: 8,
    paddingVertical: 2,
    paddingRight: 4,
  },
  pill: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  label: {
    fontFamily: fonts.mono,
    fontSize: 11.5,
    letterSpacing: 0.3,
  },
});
