import { Pressable, StyleSheet, Text, type StyleProp, type ViewStyle } from 'react-native';
import { colors } from '../theme/colors';
import { fonts } from '../theme/fonts';

interface Props {
  title: string;
  onPress: () => void;
  variant?: 'punch' | 'citrus' | 'ghost';
  style?: StyleProp<ViewStyle>;
}

export function PillButton({ title, onPress, variant = 'punch', style }: Props) {
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

const styles = StyleSheet.create({
  base: {
    paddingHorizontal: 24,
    paddingVertical: 13,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
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
    color: colors.cream,
    opacity: 0.75,
  },
});
