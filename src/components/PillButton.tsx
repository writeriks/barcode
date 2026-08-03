import { Ionicons } from '@expo/vector-icons';
import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, type StyleProp, type ViewStyle } from 'react-native';
import { useThemeColors } from '../theme/ThemeContext';
import type { ColorTheme } from '../theme/colors';
import { fonts } from '../theme/fonts';

interface Props {
  title: string;
  onPress: () => void;
  variant?: 'punch' | 'citrus' | 'ghost';
  icon?: keyof typeof Ionicons.glyphMap;
  style?: StyleProp<ViewStyle>;
}

export function PillButton({ title, onPress, variant = 'punch', icon, style }: Props) {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const textColor = variant === 'citrus' ? colors.inkOnCream : variant === 'ghost' ? colors.text : colors.cream;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.base,
        variant === 'punch' && styles.punch,
        variant === 'citrus' && styles.citrus,
        variant === 'ghost' && styles.ghost,
        pressed && styles.pressed,
        style,
      ]}
    >
      {icon ? <Ionicons name={icon} size={15} color={textColor} style={styles.icon} /> : null}
      <Text
        style={[
          styles.text,
          variant === 'citrus' && styles.textOnCitrus,
          variant === 'ghost' && styles.textGhost,
        ]}
      >
        {title}
      </Text>
    </Pressable>
  );
}

function createStyles(colors: ColorTheme) {
  return StyleSheet.create({
    base: {
      flexDirection: 'row',
      paddingHorizontal: 24,
      paddingVertical: 13,
      borderRadius: 999,
      alignItems: 'center',
      justifyContent: 'center',
    },
    icon: {
      marginRight: 7,
    },
    punch: {
      backgroundColor: colors.punch,
    },
    citrus: {
      backgroundColor: colors.citrus,
    },
    ghost: {
      backgroundColor: 'transparent',
      borderWidth: 1,
      borderColor: colors.panelLine,
    },
    pressed: {
      opacity: 0.8,
    },
    text: {
      fontFamily: fonts.displayBold,
      fontSize: 13.5,
      color: colors.cream,
    },
    textOnCitrus: {
      color: colors.inkOnCream,
    },
    textGhost: {
      color: colors.text,
      opacity: 0.75,
    },
  });
}
