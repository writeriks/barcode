import { Ionicons } from '@expo/vector-icons';
import type { PillAccent } from '../components/FilterPillRow';
import type { QrContentType } from './classifyQrContent';

/** Shared icon/label lookup for a QR content type — used by the scan
 * result view, the History filters, and the My Codes type picker, so all
 * three read the same "what does a link/email/... look like" vocabulary. */
export const QR_TYPE_ICON: Record<QrContentType, keyof typeof Ionicons.glyphMap> = {
  link: 'link-outline',
  email: 'mail-outline',
  phone: 'call-outline',
  sms: 'chatbubble-ellipses-outline',
  whatsapp: 'logo-whatsapp',
  zoom: 'videocam-outline',
  wifi: 'wifi-outline',
  vcard: 'person-circle-outline',
  event: 'calendar-outline',
  otp: 'key-outline',
  text: 'document-text-outline',
  facebook: 'logo-facebook',
  instagram: 'logo-instagram',
  twitter: 'logo-twitter',
  spotify: 'musical-notes-outline',
  viber: 'chatbubbles-outline',
  location: 'location-outline',
  mecard: 'id-card-outline',
  upi: 'cash-outline',
  paypal: 'logo-paypal',
  linkedin: 'logo-linkedin',
};

export const QR_TYPE_LABEL_KEY: Record<QrContentType, string> = {
  link: 'qr.typeLink',
  email: 'qr.typeEmail',
  phone: 'qr.typePhone',
  sms: 'qr.typeSms',
  whatsapp: 'qr.typeWhatsapp',
  zoom: 'qr.typeZoom',
  wifi: 'qr.typeWifi',
  vcard: 'qr.typeVcard',
  event: 'qr.typeEvent',
  otp: 'qr.typeOtp',
  text: 'qr.typeText',
  facebook: 'qr.typeFacebook',
  instagram: 'qr.typeInstagram',
  twitter: 'qr.typeTwitter',
  spotify: 'qr.typeSpotify',
  viber: 'qr.typeViber',
  location: 'qr.typeLocation',
  mecard: 'qr.typeMecard',
  upi: 'qr.typeUpi',
  paypal: 'qr.typePaypal',
  linkedin: 'qr.typeLinkedin',
};

/** Matches History's per-type filter-pill colors, so the same type reads
 * the same color everywhere it shows up as a pill. */
export const QR_TYPE_ACCENT: Record<QrContentType, PillAccent> = {
  link: 'mint',
  email: 'citrus',
  phone: 'coral',
  sms: 'coral',
  whatsapp: 'mint',
  zoom: 'citrus',
  wifi: 'mint',
  vcard: 'citrus',
  event: 'coral',
  otp: 'punch',
  text: 'mint',
  facebook: 'mint',
  instagram: 'coral',
  twitter: 'mint',
  spotify: 'citrus',
  viber: 'coral',
  location: 'mint',
  mecard: 'citrus',
  upi: 'coral',
  paypal: 'mint',
  linkedin: 'citrus',
};

/** Only the types the generator actually has a form for — 'otp' is
 * scan-only (you don't hand-author a 2FA secret), and more of these will
 * join the list as their forms get designed. Shared by the My Codes type
 * picker and its type filter row, so both list types in the same order. */
export const QR_GENERATE_TYPES: QrContentType[] = [
  'link',
  'text',
  'email',
  'phone',
  'sms',
  'whatsapp',
  'zoom',
  'wifi',
  'vcard',
  'mecard',
  'event',
  'location',
  'upi',
  'facebook',
  'instagram',
  'twitter',
  'spotify',
  'viber',
  'paypal',
  'linkedin',
];

/** Generator types gated behind premium — a free user tapping one of
 * these in QrTypePicker opens the paywall instead of switching to it. */
export const QR_PREMIUM_TYPES: ReadonlySet<QrContentType> = new Set<QrContentType>([
  'facebook',
  'instagram',
  'twitter',
  'spotify',
  'viber',
  'paypal',
  'linkedin',
]);

/** Base URL each SocialProfileForm prefixes onto a bare username — see
 * buildSocialProfileContent. A pasted full URL bypasses this entirely. */
export const QR_SOCIAL_BASE_URL: Record<
  'facebook' | 'instagram' | 'twitter' | 'spotify' | 'viber' | 'paypal' | 'linkedin',
  string
> = {
  facebook: 'https://facebook.com/',
  instagram: 'https://instagram.com/',
  twitter: 'https://twitter.com/',
  spotify: 'https://open.spotify.com/user/',
  viber: 'https://vb.me/',
  paypal: 'https://paypal.me/',
  linkedin: 'https://linkedin.com/in/',
};
