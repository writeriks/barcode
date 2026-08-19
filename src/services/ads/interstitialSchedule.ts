/**
 * When a full-screen ad is allowed to appear.
 *
 * Two things were wrong before this. It used to fire on every scan, which
 * is the one thing it must never do — scanning is what the app is for, and
 * an ad on every user action is the placement Google's own interstitial
 * policy warns publishers off. Then the fix over-corrected: the warm-up
 * counter reset every time the app was opened, so anyone who scanned a
 * handful of things per session never saw an ad at all, which is most
 * people and therefore most of the reason to ever pay for premium.
 *
 * What is left is two rules. A first-run grace period, counted once ever
 * rather than once per launch, so nobody's first minutes with the app are
 * interrupted; and a minute of quiet after each ad, so a burst of scanning
 * costs one interruption rather than one per item.
 *
 * There is deliberately no ceiling per session or per day. A cap makes the
 * app quietest for the people using it most, which is backwards: they are
 * the ones with a reason to pay to switch the ads off, and a ceiling hands
 * them the quiet for free.
 *
 * Frequency is only half of it. The other half is that this fires when the
 * user leaves a result, not when the result arrives — see
 * ScannerFlowScreen. Same number of ads, and none of them land between the
 * camera and the answer.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

/** Scans that pass before the first ad is ever considered, counted across
 *  the app's whole life rather than the current launch. The point is that
 *  someone's first minutes are clean, not that every session is. */
const WARMUP_SCANS = 3;

/** Quiet time after showing one. Short enough to be met several times in
 *  a session, long enough that scanning a shelf of barcodes is still one
 *  interruption rather than one per barcode. */
const COOLDOWN_MS = 60 * 1000;

/** Where the lifetime scan count lives. Plain storage, not the keychain:
 *  this is a politeness counter, not an entitlement, and someone who
 *  reinstalls to reset their grace period has earned it. */
const WARMUP_KEY = 'blippo.adWarmupScans';

let warmupScans = 0;
let warmupLoaded = false;
let lastShownAt = 0;

/**
 * Reads the stored warm-up count once per launch.
 *
 * Called for its side effect and never awaited by the caller: until it
 * lands, `warmupScans` reads 0 and the schedule simply stays quiet, which
 * is the right way round to be wrong.
 */
export async function loadInterstitialSchedule(): Promise<void> {
  if (warmupLoaded) return;
  try {
    const raw = await AsyncStorage.getItem(WARMUP_KEY);
    const parsed = Number(raw);
    warmupScans = Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : 0;
  } catch {
    // Unreadable storage means the grace period starts again, which costs
    // the user nothing and us three scans.
    warmupScans = 0;
  }
  warmupLoaded = true;
}

async function persistWarmup(value: number): Promise<void> {
  try {
    await AsyncStorage.setItem(WARMUP_KEY, String(value));
  } catch {
    // Best-effort. Failing to remember costs a few extra quiet scans.
  }
}

/**
 * Call once per completed scan, then ask canShow when the user is leaving
 * the result. Counting and asking are separate because the two happen at
 * different moments now.
 */
export function recordScan(): void {
  if (warmupScans > WARMUP_SCANS) return;
  warmupScans += 1;
  void persistWarmup(warmupScans);
}

/**
 * Whether an ad may be shown at this moment.
 *
 * Asking does not spend anything — recordInterstitialShown does, and the
 * caller only gets there once an ad has really been put on screen. Keeping
 * those apart matters: an ad that failed to load used to start the
 * cooldown anyway, so a device with poor fill would quietly answer "not
 * yet" forever after.
 */
export function canShowInterstitial(now = Date.now()): boolean {
  if (warmupScans <= WARMUP_SCANS) return false;
  return lastShownAt === 0 || now - lastShownAt >= COOLDOWN_MS;
}

/** Call right after an ad has actually been shown. */
export function recordInterstitialShown(now = Date.now()): void {
  lastShownAt = now;
}

/** Testing seam — the counters above live for the life of the process. */
export function resetInterstitialSchedule(warmup = 0): void {
  warmupScans = warmup;
  warmupLoaded = true;
  lastShownAt = 0;
}
