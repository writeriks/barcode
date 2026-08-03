import { Ionicons } from '@expo/vector-icons';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { BlurView } from 'expo-blur';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
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
 * a pill that hovers above the bottom edge rather than a bar docked flush
 * against it, matching the reference design the app is styled after.
 */
export function GlassTabBar({ state, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const colors = useThemeColors();
  const mode = useThemeMode();
  const styles = useMemo(() => createStyles(colors, mode), [colors, mode]);

  return (
    <View style={[styles.wrap, { bottom: insets.bottom + 10 }]} pointerEvents="box-none">
      <BlurView intensity={68} tint={mode === 'light' ? 'light' : 'dark'} style={styles.pill}>
        <View style={styles.pillOverlay} />
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
            <Pressable key={route.key} onPress={onPress} style={styles.tab} hitSlop={6}>
              <Ionicons
                name={isFocused ? icons.active : icons.inactive}
                size={22}
                color={isFocused ? colors.mint : colors.text}
                style={{ opacity: isFocused ? 1 : 0.55 }}
              />
              <Text style={[styles.label, { color: isFocused ? colors.mint : colors.text, opacity: isFocused ? 1 : 0.55 }]}>
                {t(LABEL_KEYS[route.name] ?? route.name)}
              </Text>
            </Pressable>
          );
        })}
      </BlurView>
    </View>
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
