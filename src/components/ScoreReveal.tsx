import { useEffect, useMemo, useRef } from 'react';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';
import { useThemeColors } from '../theme/ThemeContext';
import { darkColors, type ColorTheme } from '../theme/colors';
import { fonts } from '../theme/fonts';

const GRADES = ['a', 'b', 'c', 'd', 'e'] as const;
type Grade = (typeof GRADES)[number];

function gradeColor(colors: ColorTheme, grade: Grade): string {
  if (grade === 'a' || grade === 'b') return colors.mintText;
  if (grade === 'c') return colors.citrusText;
  return colors.coralText;
}

const ROW_HEIGHT = 64;

// Confetti hues are the fixed accent colors — identical in both themes, so
// no theme lookup is needed for these.
const CONFETTI = [
  { dx: -34, dy: -30, color: darkColors.punch },
  { dx: 30, dy: -34, color: darkColors.citrus },
  { dx: -38, dy: 16, color: darkColors.mint },
  { dx: 36, dy: 22, color: darkColors.punch },
  { dx: 4, dy: -42, color: darkColors.citrus },
  { dx: -6, dy: 40, color: darkColors.mint },
];

interface Props {
  /** Raw OFF nutriscore_grade, usually 'a'..'e' but not guaranteed. */
  nutriscoreGrade?: string;
}

/**
 * A slot-machine style reveal: scrolls through the other grades before
 * landing on the real one, then bursts a little confetti. Falls back to a
 * plain "?" badge when OFF didn't give us a usable grade — there's nothing
 * to reveal in that case, so no animation is worth faking.
 */
export function ScoreReveal({ nutriscoreGrade }: Props) {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const normalized = nutriscoreGrade?.toLowerCase();
  const isValidGrade = (g: string | undefined): g is Grade => !!g && (GRADES as readonly string[]).includes(g);

  const reelLetters = useMemo(() => {
    if (!isValidGrade(normalized)) return null;
    const decoys = GRADES.filter((g) => g !== normalized);
    return [...decoys, normalized];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [normalized]);

  const translateY = useRef(new Animated.Value(0)).current;
  const confettiProgress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!reelLetters) return;
    translateY.setValue(0);
    confettiProgress.setValue(0);
    const targetIndex = reelLetters.length - 1;
    Animated.timing(translateY, {
      toValue: -(targetIndex * ROW_HEIGHT),
      duration: 1100,
      easing: Easing.out(Easing.elastic(1.1)),
      useNativeDriver: true,
    }).start(() => {
      Animated.timing(confettiProgress, {
        toValue: 1,
        duration: 700,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }).start();
    });
  }, [reelLetters, translateY, confettiProgress]);

  if (!reelLetters || !isValidGrade(normalized)) {
    return (
      <View style={[styles.window, styles.windowNeutral]}>
        <Text style={styles.unknown}>?</Text>
      </View>
    );
  }

  const landedColor = gradeColor(colors, normalized);

  return (
    <View style={styles.wrap}>
      <View style={[styles.window, { borderColor: landedColor }]}>
        <Animated.View style={{ transform: [{ translateY }] }}>
          {reelLetters.map((letter, i) => (
            <View key={`${letter}-${i}`} style={styles.row}>
              <Text
                style={[
                  styles.letter,
                  i === reelLetters.length - 1 && {
                    color: landedColor,
                    opacity: 1,
                    textShadowColor: landedColor,
                    textShadowRadius: 10,
                    textShadowOffset: { width: 0, height: 0 },
                  },
                ]}
              >
                {letter.toUpperCase()}
              </Text>
            </View>
          ))}
        </Animated.View>
      </View>
      {CONFETTI.map((c, i) => (
        <Animated.View
          key={i}
          style={[
            styles.confetti,
            {
              backgroundColor: c.color,
              opacity: confettiProgress.interpolate({ inputRange: [0, 0.15, 1], outputRange: [0, 1, 0] }),
              transform: [
                { translateX: confettiProgress.interpolate({ inputRange: [0, 1], outputRange: [0, c.dx] }) },
                { translateY: confettiProgress.interpolate({ inputRange: [0, 1], outputRange: [0, c.dy] }) },
              ],
            },
          ]}
        />
      ))}
    </View>
  );
}

function createStyles(colors: ColorTheme) {
  return StyleSheet.create({
    wrap: {
      width: ROW_HEIGHT,
      height: ROW_HEIGHT,
    },
    window: {
      width: ROW_HEIGHT,
      height: ROW_HEIGHT,
      borderRadius: ROW_HEIGHT / 2,
      borderWidth: 3,
      overflow: 'hidden',
      backgroundColor: colors.cabinet,
    },
    windowNeutral: {
      borderColor: colors.panelLine,
      alignItems: 'center',
      justifyContent: 'center',
    },
    unknown: {
      fontFamily: fonts.displayBold,
      fontSize: 26,
      color: colors.text,
      opacity: 0.4,
    },
    row: {
      width: ROW_HEIGHT,
      height: ROW_HEIGHT,
      alignItems: 'center',
      justifyContent: 'center',
    },
    letter: {
      fontFamily: fonts.displayBold,
      fontSize: 28,
      color: colors.text,
      opacity: 0.35,
    },
    confetti: {
      position: 'absolute',
      top: '50%',
      left: '50%',
      width: 6,
      height: 6,
      borderRadius: 2,
      marginTop: -3,
      marginLeft: -3,
    },
  });
}
