import {
  useFonts,
  Fredoka_600SemiBold,
  Fredoka_700Bold,
} from '@expo-google-fonts/fredoka';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { DarkTheme, DefaultTheme, NavigationContainer } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { PostHogProvider } from 'posthog-react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GlassTabBar } from './src/navigation/GlassTabBar';
import { HistoryStack } from './src/navigation/HistoryStack';
import type { RootTabParamList } from './src/navigation/types';
import { MyCodesScreen } from './src/screens/MyCodesScreen';
import { ScannerFlowScreen } from './src/screens/ScannerFlowScreen';
import { SettingsScreen } from './src/screens/SettingsScreen';
import i18n, { isSupportedLanguage, type SupportedLanguage } from './src/i18n';
import { getLanguageOverride, setLanguageOverride } from './src/i18n/languagePreference';
import { getAnalyticsClient } from './src/services/analytics';
import { initializeAds } from './src/services/ads/initializeAds';
import { ThemeProvider, useThemeColors, useThemeMode, useThemePreference } from './src/theme/ThemeContext';
import { getDeviceLanguageCode } from './src/utils/locale';

const Tab = createBottomTabNavigator<RootTabParamList>();

export default function App() {
  const analyticsClient = getAnalyticsClient();

  const app = (
    <ThemeProvider>
      <AppContent />
    </ThemeProvider>
  );

  if (!analyticsClient) return app;

  return (
    <PostHogProvider client={analyticsClient} autocapture={false}>
      {app}
    </PostHogProvider>
  );
}

function AppContent() {
  const colors = useThemeColors();
  const mode = useThemeMode();
  const [themePreference, setThemePreference] = useThemePreference();
  const [fontsLoaded] = useFonts({ Fredoka_600SemiBold, Fredoka_700Bold });
  const [languageOverride, setLanguageOverrideState] = useState<SupportedLanguage | null>(null);
  const [languageReady, setLanguageReady] = useState(false);

  useEffect(() => {
    initializeAds();
  }, []);

  useEffect(() => {
    (async () => {
      const stored = await getLanguageOverride();
      if (stored) {
        await i18n.changeLanguage(stored);
        setLanguageOverrideState(stored);
      }
      setLanguageReady(true);
    })();
  }, []);

  const handleSelectLanguage = useCallback(async (code: SupportedLanguage | null) => {
    await setLanguageOverride(code);
    const deviceLanguage = getDeviceLanguageCode();
    const next = code ?? (isSupportedLanguage(deviceLanguage) ? deviceLanguage : 'en');
    await i18n.changeLanguage(next);
    setLanguageOverrideState(code);
  }, []);

  const navTheme = useMemo(() => {
    const base = mode === 'light' ? DefaultTheme : DarkTheme;
    return {
      ...base,
      colors: {
        ...base.colors,
        background: colors.cabinet,
        card: colors.panel,
        text: colors.text,
        border: colors.panelLine,
        primary: colors.mint,
      },
    };
  }, [colors, mode]);

  if (!fontsLoaded || !languageReady) {
    return (
      <View style={[styles.center, { backgroundColor: colors.cabinet }]}>
        <ActivityIndicator size="large" color={colors.mint} />
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={styles.flex}>
      <SafeAreaProvider>
        <NavigationContainer theme={navTheme}>
          <Tab.Navigator
            tabBar={(props) => <GlassTabBar {...props} />}
            screenOptions={{ headerShown: false, tabBarStyle: { position: 'absolute' } }}
          >
            <Tab.Screen name="Scanner" component={ScannerFlowScreen} />
            <Tab.Screen name="History" component={HistoryStack} />
            <Tab.Screen name="MyCodes" component={MyCodesScreen} />
            <Tab.Screen name="Settings">
              {() => (
                <SettingsScreen
                  currentOverride={languageOverride}
                  onSelectLanguage={handleSelectLanguage}
                  themePreference={themePreference}
                  onSelectTheme={setThemePreference}
                />
              )}
            </Tab.Screen>
          </Tab.Navigator>
        </NavigationContainer>
        <StatusBar style={mode === 'light' ? 'dark' : 'light'} />
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
