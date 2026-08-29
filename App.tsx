import {
  useFonts,
  Fredoka_600SemiBold,
  Fredoka_700Bold,
} from '@expo-google-fonts/fredoka';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { DarkTheme, DefaultTheme, NavigationContainer } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, AppState, StyleSheet, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { PostHogProvider } from 'posthog-react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GlassTabBar } from './src/navigation/GlassTabBar';
import { HistoryStack } from './src/navigation/HistoryStack';
import type { RootTabParamList } from './src/navigation/types';
import { AppLockScreen } from './src/screens/AppLockScreen';
import { MyCodesScreen } from './src/screens/MyCodesScreen';
import { OnboardingScreen } from './src/screens/OnboardingScreen';
import { ScannerFlowScreen } from './src/screens/ScannerFlowScreen';
import { SettingsScreen } from './src/screens/SettingsScreen';
import i18n, { isSupportedLanguage, type SupportedLanguage } from './src/i18n';
import { getLanguageOverride, setLanguageOverride } from './src/i18n/languagePreference';
import {
  isAppLockEnabled as getAppLockEnabled,
  isBackgroundLockIgnored,
  setSessionLocked,
} from './src/services/appLock';
import { isOnboardingCompleted, setOnboardingCompleted } from './src/services/onboardingPreference';
import { getAnalyticsClient } from './src/services/analytics';
import { initializeAds } from './src/services/ads/initializeAds';
import { useAppOpenAd } from './src/hooks/useAppOpenAd';
import { PremiumProvider, usePremium } from './src/premium/PremiumContext';
import { ThemeProvider, useThemeColors, useThemeMode, useThemePreference } from './src/theme/ThemeContext';
import { getDeviceLanguageCode } from './src/utils/locale';

const Tab = createBottomTabNavigator<RootTabParamList>();

export default function App() {
  const analyticsClient = getAnalyticsClient();

  const app = (
    <ThemeProvider>
      <PremiumProvider>
        <AppContent />
      </PremiumProvider>
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
  const { isPremium, isReady: isPremiumReady } = usePremium();
  const [themePreference, setThemePreference] = useThemePreference();
  const [fontsLoaded] = useFonts({ Fredoka_600SemiBold, Fredoka_700Bold });
  const [languageOverride, setLanguageOverrideState] = useState<SupportedLanguage | null>(null);
  const [languageReady, setLanguageReady] = useState(false);
  const [appLockEnabled, setAppLockEnabledState] = useState(false);
  const [appLockReady, setAppLockReady] = useState(false);
  const [isLocked, setIsLocked] = useState(false);
  const [hasEnteredApp, setHasEnteredApp] = useState(false);
  const [needsOnboarding, setNeedsOnboarding] = useState(false);
  const [onboardingReady, setOnboardingReady] = useState(false);

  useEffect(() => {
    isOnboardingCompleted().then((completed) => {
      setNeedsOnboarding(!completed);
      setOnboardingReady(true);
    });
  }, []);

  // Held until onboarding is out of the way: this is what asks for
  // tracking permission, and the system dialog should land after the user
  // has read what the app is, not over a welcome screen they haven't.
  useEffect(() => {
    if (!onboardingReady || needsOnboarding) return;
    void initializeAds();
  }, [onboardingReady, needsOnboarding]);

  useEffect(() => {
    getAppLockEnabled().then((enabled) => {
      setAppLockEnabledState(enabled);
      setIsLocked(enabled);
      setAppLockReady(true);
    });
  }, []);

  // App Lock is premium-only, and the read above happens before
  // RevenueCat has said whether this user still has premium — so ask
  // again once it has. `isLocked` is deliberately left alone: an app that
  // opened locked should be dismissed by the person holding it, not by a
  // subscription check deciding to let them past.
  useEffect(() => {
    if (!isPremiumReady) return;
    getAppLockEnabled().then(setAppLockEnabledState);
  }, [isPremiumReady, isPremium]);

  // Re-lock when the app truly returns from the background — not on every
  // 'active' transition, since the Face ID/passcode prompt itself briefly
  // flips the app to 'inactive' and back to 'active' when it resolves.
  // Matching that too would re-lock the instant a correct unlock succeeds.
  // StoreKit's manage-subscriptions sheet also backgrounds us; locking
  // then would unmount Settings under the sheet and freeze the app.
  const appStateRef = useRef(AppState.currentState);
  useEffect(() => {
    if (!appLockEnabled) return;
    const subscription = AppState.addEventListener('change', (nextState) => {
      if (appStateRef.current === 'background' && nextState === 'active' && !isBackgroundLockIgnored()) {
        setIsLocked(true);
      }
      appStateRef.current = nextState;
    });
    return () => subscription.remove();
  }, [appLockEnabled]);

  const handleAppLockChanged = useCallback((enabled: boolean) => {
    setAppLockEnabledState(enabled);
  }, []);

  const handleUnlocked = useCallback(() => {
    setIsLocked(false);
    setHasEnteredApp(true);
  }, []);

  useEffect(() => {
    setSessionLocked(isLocked && hasEnteredApp);
  }, [isLocked, hasEnteredApp]);

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

  // Past onboarding and the lock — never over a welcome screen, a Face ID
  // prompt, or the spinner that holds the tree until those are decided.
  useAppOpenAd({
    adsSdkMayStart: onboardingReady && !needsOnboarding,
    appIsInteractive:
      fontsLoaded && languageReady && appLockReady && onboardingReady && !needsOnboarding && !isLocked,
  });

  if (!fontsLoaded || !languageReady || !appLockReady || !onboardingReady) {
    return (
      <View style={[styles.center, { backgroundColor: colors.cabinet }]}>
        <ActivityIndicator size="large" color={colors.mint} />
      </View>
    );
  }

  // Ahead of the lock screen on purpose: a first run has nothing to
  // protect yet, and being asked for Face ID before knowing what the app
  // is would be the wrong first impression.
  if (needsOnboarding) {
    return (
      <SafeAreaProvider>
        <OnboardingScreen
          onDone={() => {
            setOnboardingCompleted();
            setNeedsOnboarding(false);
          }}
        />
        <StatusBar style={mode === 'light' ? 'dark' : 'light'} />
      </SafeAreaProvider>
    );
  }

  // Cold start: don't mount the tabs until the first unlock, so the
  // camera never starts behind a lock the user hasn't passed. After
  // that, re-lock is an overlay — unmounting under a system sheet
  // (StoreKit subscriptions, Face ID) freezes the app.
  if (isLocked && !hasEnteredApp) {
    return (
      <SafeAreaProvider>
        <AppLockScreen onUnlocked={handleUnlocked} />
        <StatusBar style={mode === 'light' ? 'dark' : 'light'} />
      </SafeAreaProvider>
    );
  }

  return (
    <GestureHandlerRootView style={styles.flex}>
      <SafeAreaProvider>
        <NavigationContainer theme={navTheme}>
          <Tab.Navigator
            tabBar={(props) => <GlassTabBar {...props} />}
            screenOptions={{ headerShown: false, tabBarStyle: { position: 'absolute' }, animation: 'fade' }}
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
                  appLockEnabled={appLockEnabled}
                  onAppLockChanged={handleAppLockChanged}
                />
              )}
            </Tab.Screen>
          </Tab.Navigator>
        </NavigationContainer>
        {isLocked ? (
          <View style={styles.lockCover} pointerEvents="auto">
            <AppLockScreen onUnlocked={handleUnlocked} />
          </View>
        ) : null}
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
  lockCover: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 100,
  },
});
