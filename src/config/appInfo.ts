export const APP_NAME = 'Blippo';
export const APP_VERSION = '1.0.0';
export const CONTACT_EMAIL = 'emirhaktan@gmail.com';

/** Required by Open Food Facts' API usage policy: identify the app and give
 * them a way to reach us if we're causing trouble. */
export const USER_AGENT = `${APP_NAME}/${APP_VERSION} (${CONTACT_EMAIL})`;

// The real deployed barcode-web site.
export const WEBSITE_URL = 'https://barcode-web-omega.vercel.app/';
export const FAQ_URL = 'https://barcode-web-omega.vercel.app/faq';
export const PRIVACY_POLICY_URL = 'https://barcode-web-omega.vercel.app/privacy';
export const TERMS_OF_USE_URL = 'https://barcode-web-omega.vercel.app/terms';

/** User-facing support address — shown in Settings' Contact row. Distinct
 * from CONTACT_EMAIL above, which only exists to satisfy Open Food Facts'
 * API usage policy and isn't meant for end users to write to. */
export const SUPPORT_EMAIL = 'patymateapp@gmail.com';
