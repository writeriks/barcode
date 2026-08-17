import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Application from 'expo-application';
import * as StoreReview from 'expo-store-review';

const SUCCESSFUL_SCANS_KEY = 'blippo.successfulScans';
const PROMPTED_VERSION_KEY = 'blippo.reviewPromptedVersion';

/** How much use has to happen before asking. Someone who has scanned this
 * many things has actually got value out of the app; asking on the first
 * scan is how an app gets one star for being pushy. */
const SCANS_BEFORE_PROMPT = 8;

/**
 * Ordinary storage, not the keychain. A reinstall genuinely is a fresh
 * start here — unlike the free-scan allowance, there's nothing to protect,
 * and someone who comes back after deleting the app is allowed to be asked
 * again eventually.
 */
async function readCount(): Promise<number> {
  try {
    const raw = await AsyncStorage.getItem(SUCCESSFUL_SCANS_KEY);
    const parsed = Number(raw);
    return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : 0;
  } catch {
    return 0;
  }
}

/** Counts one scan that actually worked. Failures and cancellations don't
 * count — the whole point is to ask off the back of a good experience. */
export async function recordSuccessfulScan(): Promise<void> {
  try {
    const next = await readCount();
    await AsyncStorage.setItem(SUCCESSFUL_SCANS_KEY, String(next + 1));
  } catch {
    // A counter that didn't save just delays the prompt. Never worth
    // failing the scan the user just completed.
  }
}

/**
 * Asks for a rating, if this is a good moment to.
 *
 * Call it from somewhere calm — a list the user has just navigated to —
 * never straight after a scan, an error, or a dismissed paywall. iOS
 * decides whether the dialog actually appears (it allows at most three a
 * year and the user can switch it off entirely), so this must never gate
 * anything or expect a result: there is no way to know whether a review
 * was left, and asking again from the app's side would be the wrong
 * response anyway.
 *
 * Once per app version at most, on top of whatever iOS allows.
 */
export async function maybeRequestReview(): Promise<void> {
  try {
    const version = Application.nativeApplicationVersion ?? 'unknown';
    const [count, promptedVersion] = await Promise.all([
      readCount(),
      AsyncStorage.getItem(PROMPTED_VERSION_KEY),
    ]);
    if (count < SCANS_BEFORE_PROMPT || promptedVersion === version) return;
    if (!(await StoreReview.hasAction())) return;

    // Written before asking, not after: if the dialog is suppressed by
    // iOS, retrying on every visit to the screen would achieve nothing
    // and cost a storage read each time.
    await AsyncStorage.setItem(PROMPTED_VERSION_KEY, version);
    await StoreReview.requestReview();
  } catch {
    // Never let asking for a review break the screen that asked.
  }
}
