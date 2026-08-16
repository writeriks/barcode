import * as SecureStore from 'expo-secure-store';

/** How many document scans the free plan includes. One "scan" is a single
 * trip through the document camera, however many pages it captures — the
 * free tier limits how often you can scan, not how much of each document
 * you get to keep. */
export const FREE_SCAN_LIMIT = 3;

// Kept in the keychain rather than AsyncStorage on purpose: keychain
// entries outlive deleting and reinstalling the app, so the free allowance
// can't be topped back up by a reinstall. Not bulletproof — someone
// determined can still clear it — but a reinstall also wipes their whole
// history and saved codes, which is a steep price for one more scan.
const USED_COUNT_KEY = 'blippo.documentScansUsed';

async function getUsedCount(): Promise<number> {
  try {
    const raw = await SecureStore.getItemAsync(USED_COUNT_KEY);
    const parsed = Number(raw);
    return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : 0;
  } catch {
    // A keychain we can't read shouldn't lock anyone out of the feature —
    // fail open and treat the allowance as untouched.
    return 0;
  }
}

export async function getRemainingFreeScans(): Promise<number> {
  return Math.max(0, FREE_SCAN_LIMIT - (await getUsedCount()));
}

/** Hands the free allowance back, for testing. Surviving a reinstall is
 * the whole point of keeping this in the keychain, which also means a
 * test device that has spent its three scans can't get back to the free
 * flow on its own — hence this, behind the same flag as the premium
 * override (see config/premiumEnv.ts). */
export async function resetFreeScans(): Promise<void> {
  try {
    await SecureStore.deleteItemAsync(USED_COUNT_KEY);
  } catch {
    // Nothing stored to clear is the state we wanted anyway.
  }
}

/** Records one used scan and returns what's left. Call this only after a
 * scan actually produced pages — cancelling out of the camera shouldn't
 * cost anything. Premium callers should skip it entirely. */
export async function consumeFreeScan(): Promise<number> {
  const used = await getUsedCount();
  const next = Math.min(used + 1, FREE_SCAN_LIMIT);
  try {
    await SecureStore.setItemAsync(USED_COUNT_KEY, String(next));
  } catch {
    // Best-effort — failing to write the counter shouldn't fail the scan
    // the user just completed.
  }
  return Math.max(0, FREE_SCAN_LIMIT - next);
}
