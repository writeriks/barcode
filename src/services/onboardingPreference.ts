import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = 'blippo.onboardingCompleted';

/**
 * Ordinary storage, not the keychain — the opposite call from the
 * free-scan allowance. Deleting and reinstalling the app genuinely is a
 * first run, and someone coming back to it deserves the introduction
 * again rather than being remembered by something they can't see.
 */
export async function isOnboardingCompleted(): Promise<boolean> {
  try {
    return (await AsyncStorage.getItem(KEY)) === 'true';
  } catch {
    // Unreadable storage shouldn't trap anyone on the welcome screen.
    return true;
  }
}

export async function setOnboardingCompleted(): Promise<void> {
  try {
    await AsyncStorage.setItem(KEY, 'true');
  } catch {
    // Worst case it shows once more next launch.
  }
}
