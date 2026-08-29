/**
 * Native sheets that background the app — the photo picker, VisionKit,
 * Share, Calendar, Contacts, StoreKit — are not a real leave. Returning
 * from one must not lock the app or fire an App Open ad.
 *
 * Nested presents (a share from a picker, a second StoreKit sheet) share
 * one session: the trailing `background → active` is only honoured once
 * the last one has settled, plus a short grace for the event that often
 * arrives after our own cleanup.
 */

const DEFAULT_GRACE_MS = 1500;

let depth = 0;
let ignoreUntil = 0;

/** Call synchronously before presenting a system sheet. */
export function beginSystemUiSession(): void {
  depth += 1;
  ignoreUntil = Number.POSITIVE_INFINITY;
}

/** Call after that sheet has settled. */
export function endSystemUiSession(graceMs = DEFAULT_GRACE_MS): void {
  depth = Math.max(0, depth - 1);
  if (depth === 0) {
    ignoreUntil = Date.now() + graceMs;
  }
}

export function isSystemUiSessionActive(): boolean {
  return depth > 0 || Date.now() < ignoreUntil;
}

/** Runs `work` with the session held, then the usual grace. */
export async function withSystemUi<T>(work: () => Promise<T>, graceMs = DEFAULT_GRACE_MS): Promise<T> {
  beginSystemUiSession();
  try {
    return await work();
  } finally {
    endSystemUiSession(graceMs);
  }
}
