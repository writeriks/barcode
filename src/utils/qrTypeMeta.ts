import { Ionicons } from '@expo/vector-icons';
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
