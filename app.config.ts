import type { ExpoConfig } from 'expo/config';

// Google's public sample AdMob App IDs — safe defaults so prebuild/EAS
// builds never fail just because .env hasn't been created yet. Real values
// go in .env (see .env.example); this file falls back to test IDs whenever
// they're missing.
const TEST_ADMOB_ANDROID_APP_ID = 'ca-app-pub-3940256099942544~3347511713';
const TEST_ADMOB_IOS_APP_ID = 'ca-app-pub-3940256099942544~1458002511';

const androidAppId = process.env.EXPO_PUBLIC_ADMOB_ANDROID_APP_ID || TEST_ADMOB_ANDROID_APP_ID;
const iosAppId = process.env.EXPO_PUBLIC_ADMOB_IOS_APP_ID || TEST_ADMOB_IOS_APP_ID;

// Reveals the Settings rows that switch premium on for free and reset the
// document-scan allowance (see src/config/premiumEnv.ts).
//
// On by default, off for EAS. That direction is deliberate: a local
// `expo run:ios --configuration Release` has no RevenueCat key, so the
// override is the *only* way to reach a premium feature there, and making
// that require an opt-in file would defeat the point. Meanwhile everything
// that reaches a user is built by EAS, which sets EAS_BUILD on its
// builders — so the builds that must not carry this are exactly the ones
// that identify themselves.
//
// Setting EXPO_PUBLIC_PREMIUM_TESTING=false turns it off locally too.
const isEasBuild = process.env.EAS_BUILD === 'true';
const premiumTestingEnabled = !isEasBuild && process.env.EXPO_PUBLIC_PREMIUM_TESTING !== 'false';

// The English original of every permission prompt. Each one names what the
// app does with the permission and gives an example of when — Apple
// rejects a description that only restates the permission's name
// (Guideline 5.1.1(iv)), which is what happened here before.
//
// The app's name is written out rather than using $(PRODUCT_NAME). That
// placeholder is expanded in the Info.plist but *not* in the
// InfoPlist.strings files the `locales` key below generates (they're
// copied as plain resources), so every non-default language would show the
// placeholder text itself. It also resolves to the Xcode target's name,
// which is still "Beep" in any ios/ directory generated before the rename.
//
// Keep these in sync with the same keys in locales/*.json — those are the
// translations, and iOS prefers them over these whenever the device's
// language has a file.
//
// Never a straight double quote in any of them. These reach Info.plist,
// which is XML and would cope — but their translations reach
// InfoPlist.strings, which Expo writes as `KEY = "value";` with no
// escaping at all (@expo/config-plugins/build/ios/Locales.js, line 80).
// One `"` in a value closes the string early, the file stops parsing, and
// the build fails in CopyStringsFile. Typographic quotes are what these
// languages set anyway.
const PERMISSIONS = {
  camera:
    'Blippo uses the camera to scan barcodes, QR codes and paper documents. For example, point it at a ' +
    'grocery barcode to see what the product is, or at a receipt to save it and copy the text out of it.',
  photoLibrary:
    'Blippo opens a photo you pick so it can read a barcode or QR code that is already in it — a ticket, ' +
    'a boarding pass, or a Wi-Fi code someone sent you as a picture.',
  photoLibraryAdd:
    'Blippo saves a scanned page or a QR code image to your photos when you choose “Save Image” while ' +
    'sharing it.',
  faceId:
    'Blippo uses Face ID to unlock the app, so your saved scans and documents stay private if someone ' +
    'else picks up your iPhone.',
  tracking:
    'This identifier is used to show ads that are more relevant to you. Your scans and documents are ' +
    'never shared.',
} as const;

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
    // Deliberately no UIFileSharingEnabled/LSSupportsOpeningDocumentsInPlace.
    // Those expose the whole Documents directory to the Files app and to
    // Finder, which would put every scanned page a tap away regardless of
    // what the app is willing to hand out. Leaving them off is what keeps
    // scans private — they can still live in Documents (see
    // modules/expo-document-scanner) and leave only through a share the
    // app initiated, where "Save to Files" is offered as a destination.
    infoPlist: {
      // No config plugin writes this one — expo-image-picker's only covers
      // *reading* the library (NSPhotoLibraryUsageDescription, see its
      // withImagePicker.js). Adding to it is a separate permission, and
      // iOS terminates the app outright when a save is attempted without
      // this key. It gets attempted every time someone picks "Save Image"
      // out of the share sheet on a scanned page or a QR image, which is
      // an ordinary thing to do.
      NSPhotoLibraryAddUsageDescription: PERMISSIONS.photoLibraryAdd,
    },
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
    premiumTestingEnabled,
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
        cameraPermission: PERMISSIONS.camera,
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
        photosPermission: PERMISSIONS.photoLibrary,
        // expo-camera's plugin already sets these — avoid two plugins fighting over the same Info.plist keys.
        cameraPermission: false,
        microphonePermission: false,
      },
    ],
    [
      'expo-tracking-transparency',
      {
        userTrackingPermission: PERMISSIONS.tracking,
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
        faceIDPermission: PERMISSIONS.faceId,
      },
    ],
  ],
};

export default config;
