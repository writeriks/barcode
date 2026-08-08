export const APP_NAME = 'BarcodeIngredients';
export const APP_VERSION = '1.0.0';
export const CONTACT_EMAIL = 'emirhaktan@gmail.com';

/** Required by Open Food Facts' API usage policy: identify the app and give
 * them a way to reach us if we're causing trouble. */
export const USER_AGENT = `${APP_NAME}/${APP_VERSION} (${CONTACT_EMAIL})`;

// TODO: point these at the real deployed barcode-web domain once it's
// live — Apple requires working Privacy Policy/Terms links on any
// auto-renewable subscription screen (Guideline 3.1.2), so these can't
// stay placeholders when the app actually ships.
export const PRIVACY_POLICY_URL = 'https://blippo.app/privacy';
export const TERMS_OF_USE_URL = 'https://blippo.app/terms';
