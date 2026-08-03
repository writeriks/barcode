import {
  useFonts,
  Fredoka_600SemiBold,
  Fredoka_700Bold,
} from '@expo-google-fonts/fredoka';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { DarkTheme, NavigationContainer } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GlassTabBar } from './src/navigation/GlassTabBar';
import { HistoryStack } from './src/navigation/HistoryStack';
import type { RootTabParamList } from './src/navigation/types';
import { MyCodesScreen } from './src/screens/MyCodesScreen';
import { ScannerFlowScreen } from './src/screens/ScannerFlowScreen';
import { SettingsScreen } from './src/screens/SettingsScreen';
import i18n, { isSupportedLanguage, type SupportedLanguage } from './src/i18n';
import { getLanguageOverride, setLanguageOverride } from './src/i18n/languagePreference';
import { initializeAds } from './src/services/ads/initializeAds';
import { colors } from './src/theme/colors';
import { getDeviceLanguageCode } from './src/utils/locale';

const Tab = createBottomTabNavigator<RootTabParamList>();

const NAV_THEME = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    background: colors.cabinet,
    card: colors.panel,
    text: colors.cream,
    border: colors.panelLine,
    primary: colors.mint,
  },
};

export default function App() {
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

  if (!fontsLoaded || !languageReady) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.mint} />
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={styles.flex}>
      <SafeAreaProvider>
        <NavigationContainer theme={NAV_THEME}>
          <Tab.Navigator
            tabBar={(props) => <GlassTabBar {...props} />}
            screenOptions={{ headerShown: false, tabBarStyle: { position: 'absolute' } }}
          >
            <Tab.Screen name="Scanner" component={ScannerFlowScreen} />
            <Tab.Screen name="History" component={HistoryStack} />
            <Tab.Screen name="MyCodes" component={MyCodesScreen} />
            <Tab.Screen name="Settings">
              {() => <SettingsScreen currentOverride={languageOverride} onSelectLanguage={handleSelectLanguage} />}
            </Tab.Screen>
          </Tab.Navigator>
        </NavigationContainer>
        <StatusBar style="light" />
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
    backgroundColor: colors.cabinet,
  },
});
