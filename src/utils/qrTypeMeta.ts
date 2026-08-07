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
  'event',
];
