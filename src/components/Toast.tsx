import { useEffect, useMemo, useRef } from 'react';
import { Animated, StyleSheet, Text } from 'react-native';
import { useThemeColors } from '../theme/ThemeContext';
import type { ColorTheme } from '../theme/colors';
import { fonts } from '../theme/fonts';

interface Props {
  /** Re-triggers the fade-in/hold/fade-out sequence whenever it changes to
   * a non-null value (even to the same string as before, since the caller
   * is expected to reset it to null between shows — see useToast below). */
  message: string | null;
  bottom: number;
}

const VISIBLE_MS = 2000;

function createStyles(colors: ColorTheme) {
  return StyleSheet.create({
    wrap: {
      position: 'absolute',
      left: 24,
      right: 24,
      alignItems: 'center',
    },
    bubble: {
      backgroundColor: colors.panel,
      borderWidth: 1,
      borderColor: colors.panelLine,
      borderRadius: 999,
      paddingHorizontal: 18,
      paddingVertical: 11,
    },
    text: {
      fontFamily: fonts.displayBold,
      fontSize: 13,
      color: colors.text,
    },
  });
}

/** A small auto-dismissing banner — fades in, holds, fades out. The caller
 * owns the message state (see useToast) and positions it via `bottom`. */
export function Toast({ message, bottom }: Props) {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!message) return;
    opacity.setValue(0);
    Animated.sequence([
      Animated.timing(opacity, { toValue: 1, duration: 180, useNativeDriver: true }),
      Animated.delay(VISIBLE_MS),
      Animated.timing(opacity, { toValue: 0, duration: 220, useNativeDriver: true }),
    ]).start();
  }, [message, opacity]);

  if (!message) return null;

  return (
    <Animated.View pointerEvents="none" style={[styles.wrap, { bottom, opacity }]}>
      <Animated.View style={styles.bubble}>
        <Text style={styles.text}>{message}</Text>
      </Animated.View>
    </Animated.View>
  );
}
