import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useColorScheme } from 'react-native';
import { darkColors, lightColors, type ColorTheme } from './colors';
import { getThemeOverride, setThemeOverride, type ThemePreference } from './themePreference';

interface ThemeContextValue {
  colors: ColorTheme;
  mode: 'light' | 'dark';
  preference: ThemePreference;
  setPreference: (preference: ThemePreference) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

/** Resolves the effective light/dark mode from the device's setting,
 * overridden by whatever the user picked in Settings — mirrors how the
 * language override layers on top of the device language. */
export function ThemeProvider({ children }: { children: ReactNode }) {
  const systemScheme = useColorScheme();
  const [preference, setPreferenceState] = useState<ThemePreference>(null);

  useEffect(() => {
    getThemeOverride().then(setPreferenceState);
  }, []);

  const setPreference = useCallback((next: ThemePreference) => {
    setPreferenceState(next);
    setThemeOverride(next);
  }, []);

  const mode: 'light' | 'dark' = preference ?? (systemScheme === 'light' ? 'light' : 'dark');
  const colors = mode === 'light' ? lightColors : darkColors;

  const value = useMemo(
    () => ({ colors, mode, preference, setPreference }),
    [colors, mode, preference, setPreference]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

function useThemeContext(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useThemeColors/useThemeMode must be used within a ThemeProvider');
  return ctx;
}

export function useThemeColors(): ColorTheme {
  return useThemeContext().colors;
}

export function useThemeMode(): 'light' | 'dark' {
  return useThemeContext().mode;
}

export function useThemePreference(): [ThemePreference, (preference: ThemePreference) => void] {
  const { preference, setPreference } = useThemeContext();
  return [preference, setPreference];
}
