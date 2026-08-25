import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = 'blippo.firstRunPaywallShown';

/**
 * Whether the one-off upgrade pitch has already had its turn.
 *
 * The pitch is shown once, on the way back from a new user's first
 * result. Intent is at its highest in that first session — which is the
 * whole argument for showing it then — but that argument runs out the
 * moment it has been seen and dismissed. After this, premium is only ever
 * raised where the user has actually walked into it: the monthly document
 * allowance, the appearance section, Settings.
 *
 * Ordinary storage rather than the keychain, matching the onboarding
 * flag. Someone who deletes the app and comes back genuinely is a new
 * install, and a purchase pitch is not something to remember about a
 * person behind their back.
 */
export async function isFirstRunPaywallShown(): Promise<boolean> {
  try {
    return (await AsyncStorage.getItem(KEY)) === 'true';
  } catch {
    // Unreadable storage should err towards not pestering anyone.
    return true;
  }
}

export async function setFirstRunPaywallShown(): Promise<void> {
  try {
    await AsyncStorage.setItem(KEY, 'true');
  } catch {
    // Worst case it appears once more, which is survivable; the
    // alternative — failing the scan flow over a write — is not.
  }
}
