import { Ionicons } from '@expo/vector-icons';
import { BottomTabBarHeightCallbackContext, type BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { BlurView } from 'expo-blur';
import { useContext, useEffect, useMemo, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Animated, Platform, Pressable, StyleSheet, Text, View, type LayoutChangeEvent } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useThemeColors, useThemeMode } from '../theme/ThemeContext';
import type { ColorTheme } from '../theme/colors';
import { fonts } from '../theme/fonts';

const ICONS: Record<string, { active: keyof typeof Ionicons.glyphMap; inactive: keyof typeof Ionicons.glyphMap }> = {
  Scanner: { active: 'scan', inactive: 'scan-outline' },
  History: { active: 'time', inactive: 'time-outline' },
  MyCodes: { active: 'qr-code', inactive: 'qr-code-outline' },
  Settings: { active: 'settings', inactive: 'settings-outline' },
};

const LABEL_KEYS: Record<string, string> = {
  Scanner: 'tabs.scanner',
  History: 'tabs.history',
  MyCodes: 'tabs.myCodes',
  Settings: 'tabs.settings',
};

/**
 * A floating, frosted-glass bottom tab bar (Apple "Liquid Glass" style) —
 * a pill that hovers above the bottom edge, with a glass capsule that
 * slides/springs to the selected tab rather than just swapping colors.
 */
export function GlassTabBar({ state, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const colors = useThemeColors();
  const mode = useThemeMode();
  const styles = useMemo(() => createStyles(colors, mode), [colors, mode]);
  const routeCount = state.routes.length;
  const bottomOffset = insets.bottom + 10;

  // The tab bar floats as an absolutely-positioned pill, so react-navigation's
  // own height estimate (a plain UIKit constant) is too small — screens using
  // useBottomTabBarHeight() would under-pad and get covered by the pill.
  // Report the real measured clearance back so that hook returns the truth.
  const onHeightChange = useContext(BottomTabBarHeightCallbackContext);
  const handlePillLayout = (event: LayoutChangeEvent) => {
    onHeightChange?.(event.nativeEvent.layout.height + bottomOffset);
  };

  const indicatorIndex = useRef(new Animated.Value(state.index)).current;

  useEffect(() => {
    Animated.spring(indicatorIndex, {
      toValue: state.index,
      useNativeDriver: false,
      friction: 8,
      tension: 60,
    }).start();
  }, [state.index, indicatorIndex]);

  const indicatorLeft = indicatorIndex.interpolate({
    inputRange: [0, Math.max(routeCount - 1, 1)],
    outputRange: ['0%', `${((routeCount - 1) / routeCount) * 100}%`],
  });

  return (
    <View style={[styles.wrap, { bottom: bottomOffset }]} pointerEvents="box-none">
      <BlurView
        intensity={68}
        tint={mode === 'light' ? 'light' : 'dark'}
        style={styles.pill}
        onLayout={handlePillLayout}
      >
        <View style={styles.pillOverlay} />
        <Animated.View
          style={[styles.indicator, { width: `${100 / routeCount}%`, left: indicatorLeft }]}
        >
          <View style={styles.indicatorHighlight} />
        </Animated.View>
        {state.routes.map((route, index) => {
          const isFocused = state.index === index;
          const icons = ICONS[route.name] ?? { active: 'ellipse', inactive: 'ellipse-outline' };

          const onPress = () => {
            const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
            if (!isFocused && !event.defaultPrevented) {
              navigation.navigate(route.name);
            }
          };

          return (
            <GlassTab
              key={route.key}
              onPress={onPress}
              isFocused={isFocused}
              icon={isFocused ? icons.active : icons.inactive}
              label={t(LABEL_KEYS[route.name] ?? route.name)}
              colors={colors}
              styles={styles}
            />
          );
        })}
      </BlurView>
    </View>
  );
}

function GlassTab({
  onPress,
  isFocused,
  icon,
  label,
  colors,
  styles,
}: {
  onPress: () => void;
  isFocused: boolean;
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  colors: ColorTheme;
  styles: Styles;
}) {
  const scale = useRef(new Animated.Value(1)).current;
  const focusScale = useRef(new Animated.Value(isFocused ? 1 : 0)).current;

  useEffect(() => {
    Animated.spring(focusScale, {
      toValue: isFocused ? 1 : 0,
      useNativeDriver: true,
      friction: 7,
      tension: 90,
    }).start();
  }, [isFocused, focusScale]);

  const iconScale = focusScale.interpolate({ inputRange: [0, 1], outputRange: [1, 1.12] });

  const handlePressIn = () => {
    Animated.spring(scale, { toValue: 0.88, useNativeDriver: true, friction: 6, tension: 200 }).start();
  };
  const handlePressOut = () => {
    Animated.spring(scale, { toValue: 1, useNativeDriver: true, friction: 5, tension: 160 }).start();
  };

  return (
    <Pressable onPress={onPress} onPressIn={handlePressIn} onPressOut={handlePressOut} style={styles.tab} hitSlop={6}>
      <Animated.View style={{ transform: [{ scale: Animated.multiply(scale, iconScale) }] }}>
        <Ionicons name={icon} size={22} color={isFocused ? colors.mint : colors.text} style={{ opacity: isFocused ? 1 : 0.55 }} />
      </Animated.View>
      <Text style={[styles.label, { color: isFocused ? colors.mint : colors.text, opacity: isFocused ? 1 : 0.55 }]}>
        {label}
      </Text>
    </Pressable>
  );
}

function createStyles(colors: ColorTheme, mode: 'light' | 'dark') {
  return StyleSheet.create({
    wrap: {
      position: 'absolute',
      left: 16,
      right: 16,
      alignItems: 'center',
    },
    pill: {
      flexDirection: 'row',
      width: '100%',
      borderRadius: 28,
      overflow: 'hidden',
      borderWidth: 1,
      borderColor: mode === 'light' ? 'rgba(36,25,51,0.12)' : 'rgba(255,255,255,0.14)',
      ...Platform.select({
        android: { backgroundColor: mode === 'light' ? 'rgba(255,255,255,0.85)' : 'rgba(27,19,48,0.85)' },
        default: {},
      }),
    },
    pillOverlay: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: mode === 'light' ? 'rgba(36,25,51,0.02)' : 'rgba(255,255,255,0.03)',
    },
    indicator: {
      position: 'absolute',
      top: 0,
      bottom: 0,
      borderRadius: 28,
      backgroundColor: 'rgba(47,230,184,0.16)',
      borderWidth: 1,
      borderColor: 'rgba(47,230,184,0.35)',
      overflow: 'hidden',
    },
    indicatorHighlight: {
      position: 'absolute',
      top: 0,
      left: '12%',
      right: '12%',
      height: 1,
      backgroundColor: 'rgba(255,255,255,0.5)',
    },
    tab: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 3,
      paddingVertical: 12,
    },
    label: {
      fontFamily: fonts.mono,
      fontSize: 10,
      letterSpacing: 0.3,
    },
  });
}

type Styles = ReturnType<typeof createStyles>;
