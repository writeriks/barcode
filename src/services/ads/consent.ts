import { isExpoGo } from './environment';
import { withSystemUi } from '../systemUiSession';

/**
 * Runs Google's UMP consent flow — shows the GDPR/US-states form only where
 * the AdMob console has one configured and it's legally required, resolves
 * immediately everywhere else. Returns whether ads can now be requested;
 * `initializeAds` gates the SDK init on this so nothing loads before consent
 * is settled.
 */
export async function gatherConsent(): Promise<boolean> {
  if (isExpoGo()) return false;
  const { AdsConsent } = await import('react-native-google-mobile-ads');
  try {
    const info = await withSystemUi(() => AdsConsent.gatherConsent());
    return info.canRequestAds;
  } catch {
    return false;
  }
}

/** True only when the user is in a region (currently EEA/UK) where the UMP
 * form requires offering a way to revisit their choice — used to decide
 * whether Settings shows the "Privacy choices" row at all. */
export async function isPrivacyOptionsRequired(): Promise<boolean> {
  if (isExpoGo()) return false;
  const { AdsConsent, AdsConsentPrivacyOptionsRequirementStatus } = await import(
    'react-native-google-mobile-ads'
  );
  try {
    const info = await AdsConsent.getConsentInfo();
    return info.privacyOptionsRequirementStatus === AdsConsentPrivacyOptionsRequirementStatus.REQUIRED;
  } catch {
    return false;
  }
}

export async function showPrivacyOptionsForm(): Promise<void> {
  if (isExpoGo()) return;
  const { AdsConsent } = await import('react-native-google-mobile-ads');
  await withSystemUi(() => AdsConsent.showPrivacyOptionsForm());
}
