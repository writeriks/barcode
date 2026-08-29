import * as LocalAuthentication from 'expo-local-authentication';
import { PREMIUM_SETTINGS, getPremiumSetting, setPremiumSetting } from './premiumSetting';

/** Timestamp until which returning from background must not show the lock
 * screen. `Infinity` while a system sheet (StoreKit manage-subscriptions)
 * is up — that sheet backgrounds the app, and locking would unmount the
 * presenting tree under it, which freezes the UI. */
let ignoreBackgroundLockUntil = 0;

/** Call before presenting a system sheet that will background the app. */
export function beginIgnoringBackgroundLock(): void {
  ignoreBackgroundLockUntil = Number.POSITIVE_INFINITY;
}

/** Call after that sheet has settled. A short grace covers the trailing
 * `background → active` event that often arrives after our own cleanup. */
export function endIgnoringBackgroundLock(graceMs = 1500): void {
  ignoreBackgroundLockUntil = Date.now() + graceMs;
}

export function isBackgroundLockIgnored(): boolean {
  return Date.now() < ignoreBackgroundLockUntil;
}

/** True while the in-app lock overlay is up (not the cold-start lock,
 * which never mounts the rest of the tree). Scanner listens so the
 * camera doesn't keep running under the cover. */
let sessionLocked = false;
type SessionLockListener = (locked: boolean) => void;
const sessionLockListeners = new Set<SessionLockListener>();

export function setSessionLocked(locked: boolean): void {
  if (sessionLocked === locked) return;
  sessionLocked = locked;
  sessionLockListeners.forEach((listener) => listener(locked));
}

export function isSessionLocked(): boolean {
  return sessionLocked;
}

export function subscribeToSessionLocked(listener: SessionLockListener): () => void {
  sessionLockListeners.add(listener);
  return () => sessionLockListeners.delete(listener);
}

/**
 * Off by default, and premium-only — so a subscription that ends takes the
 * lock with it (see premiumSetting).
 *
 * Which way this errs while the entitlement is still unknown matters more
 * here than for the other switches: unresolved counts as premium, so a
 * locked app stays locked through the launch gap rather than opening
 * itself for the second before RevenueCat answers. The caller reads this
 * again once the answer is in — see App.tsx.
 */
export async function isAppLockEnabled(): Promise<boolean> {
  return getPremiumSetting(PREMIUM_SETTINGS.appLock);
}

export async function setAppLockEnabled(enabled: boolean): Promise<void> {
  await setPremiumSetting(PREMIUM_SETTINGS.appLock, enabled);
}

/** True only if the device actually has Face ID/Touch ID/a passcode set up
 * — turning the setting on without this would lock the user out with no
 * way to ever authenticate back in. */
export async function isDeviceLockSupported(): Promise<boolean> {
  const hasHardware = await LocalAuthentication.hasHardwareAsync();
  if (!hasHardware) return false;
  return LocalAuthentication.isEnrolledAsync();
}

export async function authenticateAppUnlock(promptMessage: string): Promise<boolean> {
  const result = await LocalAuthentication.authenticateAsync({ promptMessage });
  return result.success;
}
