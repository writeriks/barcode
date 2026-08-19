import * as SecureStore from 'expo-secure-store';

/** How many document scans the free plan includes each month. One "scan"
 * is a single trip through the document camera, however many pages it
 * captures — the free tier limits how often you can scan, not how much of
 * each document you get to keep. */
export const FREE_SCANS_PER_MONTH = 3;

// Kept in the keychain rather than AsyncStorage on purpose: keychain
// entries outlive deleting and reinstalling the app, so the month's
// allowance can't be topped back up by a reinstall. Not bulletproof —
// someone determined can still clear it — but a reinstall also wipes their
// whole history and saved codes, which is a steep price for one more scan.
const USAGE_KEY = 'blippo.documentScanUsage';

interface Usage {
  /** The month this count belongs to, as 'YYYY-MM'. */
  period: string;
  used: number;
}

/**
 * Which month we are in, by the device's own clock.
 *
 * Local rather than UTC because the allowance is a promise made to a
 * person — "three a month" should turn over when their calendar says a new
 * month started, not when a server's does.
 */
function currentPeriod(now = new Date()): string {
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

/**
 * The stored count, or a fresh one if it belongs to a month that has
 * passed.
 *
 * A period that isn't the current one is simply ignored rather than
 * migrated, which also handles a clock moved backwards: last month's three
 * used scans don't follow you into a month you have already left, and
 * winding the date forward and back lands you on a period you have already
 * spent.
 */
async function readUsage(): Promise<Usage> {
  const period = currentPeriod();
  try {
    const raw = await SecureStore.getItemAsync(USAGE_KEY);
    if (!raw) return { period, used: 0 };
    const parsed = JSON.parse(raw) as Partial<Usage>;
    if (parsed.period !== period) return { period, used: 0 };
    const used = Number(parsed.used);
    return { period, used: Number.isFinite(used) && used > 0 ? Math.floor(used) : 0 };
  } catch {
    // A keychain we can't read, or a value we can't parse, shouldn't lock
    // anyone out of the feature — fail open and treat the month as unused.
    return { period, used: 0 };
  }
}

export async function getRemainingFreeScans(): Promise<number> {
  const { used } = await readUsage();
  return Math.max(0, FREE_SCANS_PER_MONTH - used);
}

/** Hands this month's allowance back, for testing. Surviving a reinstall
 * is the whole point of keeping this in the keychain, which also means a
 * test device that has spent its scans can't get back to the free flow on
 * its own — hence this, behind the same flag as the premium override (see
 * config/premiumEnv.ts). */
export async function resetFreeScans(): Promise<void> {
  try {
    await SecureStore.deleteItemAsync(USAGE_KEY);
  } catch {
    // Nothing stored to clear is the state we wanted anyway.
  }
}

/** Records one used scan and returns what's left this month. Call this
 * only after a scan actually produced pages — cancelling out of the camera
 * shouldn't cost anything. Premium callers should skip it entirely. */
export async function consumeFreeScan(): Promise<number> {
  const { period, used } = await readUsage();
  const next = Math.min(used + 1, FREE_SCANS_PER_MONTH);
  try {
    await SecureStore.setItemAsync(USAGE_KEY, JSON.stringify({ period, used: next } satisfies Usage));
  } catch {
    // Best-effort — failing to write the counter shouldn't fail the scan
    // the user just completed.
  }
  return Math.max(0, FREE_SCANS_PER_MONTH - next);
}
