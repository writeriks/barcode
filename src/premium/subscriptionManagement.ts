import { beginIgnoringBackgroundLock, endIgnoringBackgroundLock } from '../services/appLock';

/** StoreKit's manage-subscriptions sheet is still tearing down for this
 * long after it reports dismissed (or after we come back to foreground).
 * Hitting `getCustomerInfo` during that window deadlocks the main thread. */
const STOREKIT_SETTLE_MS = 800;
const LOCK_GRACE_MS = 1500;

let open = false;
let generation = 0;
let finishPromise: Promise<void> | null = null;

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function isSubscriptionManagementOpen(): boolean {
  return open;
}

/** Must run synchronously before the native present — the sheet can
 * background us on the same tick, and App Lock would otherwise fire. */
export function startSubscriptionManagement(): void {
  generation += 1;
  open = true;
  finishPromise = null;
  beginIgnoringBackgroundLock();
}

/** Waits for StoreKit teardown, then allows App Lock again. Safe to call
 * from both the native promise and an AppState fallback; overlapping
 * callers share one wait. A newer `start` cancels this finish so a
 * re-opened sheet isn't unlocked mid-present. */
export function finishSubscriptionManagement(): Promise<void> {
  if (finishPromise) return finishPromise;
  if (!open) return Promise.resolve();
  const gen = generation;
  finishPromise = (async () => {
    await delay(STOREKIT_SETTLE_MS);
    if (gen !== generation) return;
    open = false;
    endIgnoringBackgroundLock(LOCK_GRACE_MS);
  })();
  return finishPromise;
}
