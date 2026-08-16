import type { ExpoConfig } from 'expo/config';

// Google's public sample AdMob App IDs — safe defaults so prebuild/EAS
// builds never fail just because .env hasn't been created yet. Real values
// go in .env (see .env.example); this file falls back to test IDs whenever
// they're missing.
const TEST_ADMOB_ANDROID_APP_ID = 'ca-app-pub-3940256099942544~3347511713';
const TEST_ADMOB_IOS_APP_ID = 'ca-app-pub-3940256099942544~1458002511';

const androidAppId = process.env.EXPO_PUBLIC_ADMOB_ANDROID_APP_ID || TEST_ADMOB_ANDROID_APP_ID;
const iosAppId = process.env.EXPO_PUBLIC_ADMOB_IOS_APP_ID || TEST_ADMOB_IOS_APP_ID;

const config: ExpoConfig = {
  name: 'Blippo',
  slug: 'barcode',
  version: '1.0.0',
  orientation: 'portrait',
  icon: './assets/icon.png',
  userInterfaceStyle: 'dark',
  ios: {
    // iPhone-only on purpose — App Store Connect then only asks for iPhone
    // screenshots/metadata, no iPad requirements. The app still opens on
    // iPad (in iPhone compatibility mode), it's just not listed/optimized
    // as an iPad app.
    supportsTablet: false,
    // TODO: confirm/change before a real App Store submission — this must
    // match the bundle ID registered in your Apple Developer account.
    bundleIdentifier: 'com.writeriks.beep',
    // Deliberately no UIFileSharingEnabled/LSSupportsOpeningDocumentsInPlace:
    // those expose the whole Documents directory to the Files app and to
    // Finder, which would put every scanned page a tap away regardless of
    // what the app is willing to hand out. Scans live in Application
    // Support instead (see modules/expo-document-scanner), and leave only
    // through a share the app initiated — where "Save to Files" is still
    // one of the destinations offered.
  },
  android: {
    // TODO: confirm/change before a real Play Store submission — this must
    // match the package name registered in your Google Play Console.
    package: 'com.writeriks.beep',
    adaptiveIcon: {
      backgroundColor: '#1b1330',
      foregroundImage: './assets/android-icon-foreground.png',
      backgroundImage: './assets/android-icon-background.png',
      monochromeImage: './assets/android-icon-monochrome.png',
    },
    predictiveBackGestureEnabled: false,
  },
  web: {
    favicon: './assets/favicon.png',
  },
  extra: {
    eas: {
      projectId: '0fcdbd1d-a033-4e16-9d2e-2cfaf89c0b3e',
    },
  },
  locales: {
    en: './locales/en.json',
    tr: './locales/tr.json',
    pl: './locales/pl.json',
    es: './locales/es.json',
    fr: './locales/fr.json',
    it: './locales/it.json',
    de: './locales/de.json',
  },
  plugins: [
    [
      'expo-camera',
      {
        cameraPermission: 'Allow $(PRODUCT_NAME) to use the camera to scan barcodes and QR codes.',
      },
    ],
    ['expo-asset', { assets: [] }],
    [
      'react-native-google-mobile-ads',
      {
        androidAppId,
        iosAppId,
        // expo-tracking-transparency owns NSUserTrackingUsageDescription instead —
        // avoid two plugins fighting over the same Info.plist key.
      },
    ],
    [
      'expo-image-picker',
      {
        photosPermission:
          'Allow $(PRODUCT_NAME) to access your photos so you can look up a barcode from a saved picture.',
        // expo-camera's plugin already sets these — avoid two plugins fighting over the same Info.plist keys.
        cameraPermission: false,
        microphonePermission: false,
      },
    ],
    [
      'expo-tracking-transparency',
      {
        userTrackingPermission: 'This identifier will be used to deliver ads that are more relevant to you.',
      },
    ],
    [
      'expo-audio',
      {
        // Playback only (the scan beep) — no microphone access needed.
        microphonePermission: false,
      },
    ],
    [
      'expo-local-authentication',
      {
        faceIDPermission: 'Allow $(PRODUCT_NAME) to use Face ID to unlock the app.',
      },
    ],
  ],
};

export default config;
