import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useThemeColors } from '../theme/ThemeContext';
import type { ColorTheme } from '../theme/colors';
import { fonts } from '../theme/fonts';

interface Props<T> {
  options: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
}

/** A single pill divided into equal segments, one highlighted at a time —
 * for a small, mutually-exclusive choice (like a theme picker) where a
 * list of tappable rows would be overkill. */
export function SegmentedControl<T>({ options, value, onChange }: Props<T>) {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <View style={styles.track}>
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <Pressable
            key={String(option.value)}
            onPress={() => onChange(option.value)}
            style={[styles.segment, selected && styles.segmentSelected]}
          >
            <Text style={[styles.segmentLabel, selected && styles.segmentLabelSelected]} numberOfLines={1}>
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function createStyles(colors: ColorTheme) {
  return StyleSheet.create({
    track: {
      flexDirection: 'row',
      backgroundColor: colors.panel,
      borderWidth: 1,
      borderColor: colors.panelLine,
      borderRadius: 999,
      padding: 4,
      gap: 4,
    },
    segment: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 10,
      borderRadius: 999,
    },
    segmentSelected: {
      backgroundColor: colors.mint,
    },
    segmentLabel: {
      fontFamily: fonts.displayBold,
      fontSize: 13,
      color: colors.text,
      opacity: 0.65,
    },
    segmentLabelSelected: {
      color: colors.inkOnCream,
      opacity: 1,
    },
  });
}
