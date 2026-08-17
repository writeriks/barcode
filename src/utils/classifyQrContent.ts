export type QrContentType =
  | 'link'
  | 'email'
  | 'phone'
  | 'sms'
  | 'whatsapp'
  | 'zoom'
  | 'wifi'
  | 'vcard'
  | 'event'
  | 'otp'
  | 'text'
  | 'facebook'
  | 'instagram'
  | 'twitter'
  | 'spotify'
  | 'viber'
  | 'location'
  | 'mecard'
  | 'upi'
  | 'paypal'
  | 'linkedin'
  | 'tiktok'
  | 'youtube'
  | 'telegram'
  | 'pinterest'
  | 'appstore'
  | 'drive'
  | 'dropbox';

const WHATSAPP_LINK_PATTERN = /^https?:\/\/(wa\.me|api\.whatsapp\.com)\//i;
const ZOOM_LINK_PATTERN = /^https?:\/\/([a-z0-9-]+\.)?zoom\.us\/j\//i;
const FACEBOOK_LINK_PATTERN = /^https?:\/\/([a-z0-9-]+\.)?facebook\.com\//i;
const INSTAGRAM_LINK_PATTERN = /^https?:\/\/([a-z0-9-]+\.)?instagram\.com\//i;
const TWITTER_LINK_PATTERN = /^https?:\/\/([a-z0-9-]+\.)?(twitter\.com|x\.com)\//i;
const SPOTIFY_LINK_PATTERN = /^https?:\/\/(open\.)?spotify\.com\//i;
const VIBER_LINK_PATTERN = /^https?:\/\/(vb\.me|(invite\.)?viber\.com)\//i;
const PAYPAL_LINK_PATTERN = /^https?:\/\/(www\.)?paypal\.me\//i;
const LINKEDIN_LINK_PATTERN = /^https?:\/\/([a-z0-9-]+\.)?linkedin\.com\//i;
const TIKTOK_LINK_PATTERN = /^https?:\/\/([a-z0-9-]+\.)?tiktok\.com\//i;
const YOUTUBE_LINK_PATTERN = /^https?:\/\/([a-z0-9-]+\.)?(youtube\.com|youtu\.be)\//i;
const TELEGRAM_LINK_PATTERN = /^https?:\/\/(t\.me|telegram\.me)\//i;
const PINTEREST_LINK_PATTERN = /^https?:\/\/([a-z0-9-]+\.)?pinterest\.[a-z.]{2,}\//i;
const APPSTORE_LINK_PATTERN = /^https?:\/\/apps\.apple\.com\//i;
// Docs shares the drive.google.com file model closely enough that one
// "Drive" label covers both without lying about where the link goes.
const DRIVE_LINK_PATTERN = /^https?:\/\/(drive|docs)\.google\.com\//i;
const DROPBOX_LINK_PATTERN = /^https?:\/\/([a-z0-9-]+\.)?dropbox\.com\//i;

/** Local, network-free classification of a decoded QR string — enough to
 * pick the right primary action (Open link / Open email / Call number),
 * not a full QR-payload parser. WIFI:/VCARD/VEVENT are recognized by their
 * scheme so they can be filtered in History, but aren't parsed field by
 * field here — that's a display-time concern, not a classification one. */
export function classifyQrContent(data: string): QrContentType {
  const trimmed = data.trim();
  // Check before the generic http(s) link case below — all of these are
  // still plain URLs, just ones worth recognizing more specifically.
  if (WHATSAPP_LINK_PATTERN.test(trimmed)) return 'whatsapp';
  if (ZOOM_LINK_PATTERN.test(trimmed)) return 'zoom';
  if (FACEBOOK_LINK_PATTERN.test(trimmed)) return 'facebook';
  if (INSTAGRAM_LINK_PATTERN.test(trimmed)) return 'instagram';
  if (TWITTER_LINK_PATTERN.test(trimmed)) return 'twitter';
  if (SPOTIFY_LINK_PATTERN.test(trimmed)) return 'spotify';
  if (VIBER_LINK_PATTERN.test(trimmed)) return 'viber';
  if (PAYPAL_LINK_PATTERN.test(trimmed)) return 'paypal';
  if (LINKEDIN_LINK_PATTERN.test(trimmed)) return 'linkedin';
  if (TIKTOK_LINK_PATTERN.test(trimmed)) return 'tiktok';
  if (YOUTUBE_LINK_PATTERN.test(trimmed)) return 'youtube';
  if (TELEGRAM_LINK_PATTERN.test(trimmed)) return 'telegram';
  if (PINTEREST_LINK_PATTERN.test(trimmed)) return 'pinterest';
  if (APPSTORE_LINK_PATTERN.test(trimmed)) return 'appstore';
  if (DRIVE_LINK_PATTERN.test(trimmed)) return 'drive';
  if (DROPBOX_LINK_PATTERN.test(trimmed)) return 'dropbox';
  if (/^https?:\/\//i.test(trimmed)) return 'link';
  if (/^mailto:/i.test(trimmed)) return 'email';
  // SMSTO: is the older Nokia-era scheme some generators still emit;
  // sms: is the RFC 5724 one — both mean the same thing here.
  if (/^smsto:|^sms:/i.test(trimmed)) return 'sms';
  if (/^tel:/i.test(trimmed)) return 'phone';
  if (/^otpauth:\/\//i.test(trimmed)) return 'otp';
  if (/^upi:\/\//i.test(trimmed)) return 'upi';
  if (/^geo:/i.test(trimmed)) return 'location';
  if (/^WIFI:/i.test(trimmed)) return 'wifi';
  if (/^BEGIN:VCARD/i.test(trimmed)) return 'vcard';
  if (/^BEGIN:(VEVENT|VCALENDAR)/i.test(trimmed)) return 'event';
  if (/^MECARD:/i.test(trimmed)) return 'mecard';
  return 'text';
}

/** The URI to hand to Linking.openURL for a given classified value —
 * adds the scheme back if the QR encoded it bare (e.g. just an email
 * address rather than "mailto:..."). WiFi/vCard/event payloads have no
 * single "open" action (there's no URL scheme any app registers to join a
 * network or import a contact from a raw string), so those show the
 * decoded content instead of an Open button. */
const GEO_URI_PATTERN = /^geo:(-?\d+\.?\d*),(-?\d+\.?\d*)/i;

export function resolveQrOpenUri(data: string, type: QrContentType): string | null {
  const trimmed = data.trim();
  switch (type) {
    case 'link':
    case 'whatsapp':
    case 'zoom':
    case 'facebook':
    case 'instagram':
    case 'twitter':
    case 'spotify':
    case 'viber':
    case 'paypal':
    case 'linkedin':
    case 'tiktok':
    case 'youtube':
    case 'telegram':
    case 'pinterest':
    case 'appstore':
    case 'drive':
    case 'dropbox':
    case 'upi':
      return trimmed;
    case 'email':
      return trimmed.toLowerCase().startsWith('mailto:') ? trimmed : `mailto:${trimmed}`;
    case 'phone':
      return trimmed.toLowerCase().startsWith('tel:') ? trimmed : `tel:${trimmed}`;
    case 'sms':
      // Normalize the older SMSTO: scheme to sms: — that's the one both
      // platforms' Linking.openURL reliably recognize.
      return trimmed.toLowerCase().startsWith('smsto:') ? `sms:${trimmed.slice(6)}` : trimmed;
    case 'location': {
      // geo: isn't a scheme iOS (our only target platform) resolves —
      // that's an Android convention — so hand off to Apple Maps' web
      // link instead, which the OS always knows how to open.
      const match = trimmed.match(GEO_URI_PATTERN);
      return match ? `https://maps.apple.com/?ll=${match[1]},${match[2]}` : null;
    }
    case 'wifi':
    case 'vcard':
    case 'mecard':
    case 'event':
    case 'otp':
    case 'text':
      return null;
  }
}

export interface OtpAuthInfo {
  type: 'totp' | 'hotp';
  issuer?: string;
  accountName?: string;
  secret: string;
}

const OTP_URI_PATTERN = /^otpauth:\/\/(totp|hotp)\/([^?]*)\?(.*)$/i;

function parseQueryParams(query: string): Record<string, string> {
  const params: Record<string, string> = {};
  for (const pair of query.split('&')) {
    if (!pair) continue;
    const [rawKey, rawValue = ''] = pair.split('=');
    try {
      params[decodeURIComponent(rawKey)] = decodeURIComponent(rawValue.replace(/\+/g, ' '));
    } catch {
      // Malformed percent-encoding — skip this param rather than throw.
    }
  }
  return params;
}

/** Parses an `otpauth://` 2FA setup URI (as produced by Google
 * Authenticator, Authy, GitHub, etc. — RFC "Key URI Format"). Recognition
 * only, no TOTP/HOTP code generation. Returns null for anything that
 * doesn't carry a secret, since that's the one required field. */
export function parseOtpAuth(data: string): OtpAuthInfo | null {
  const match = data.trim().match(OTP_URI_PATTERN);
  if (!match) return null;

  const [, rawType, rawLabel, rawParams] = match;
  const params = parseQueryParams(rawParams);
  const secret = params.secret;
  if (!secret) return null;

  let label: string;
  try {
    label = decodeURIComponent(rawLabel);
  } catch {
    label = rawLabel;
  }
  const separatorIndex = label.indexOf(':');
  const labelIssuer = separatorIndex >= 0 ? label.slice(0, separatorIndex).trim() : undefined;
  const accountName = (separatorIndex >= 0 ? label.slice(separatorIndex + 1) : label).trim();

  return {
    type: rawType.toLowerCase() as 'totp' | 'hotp',
    issuer: params.issuer || labelIssuer || undefined,
    accountName: accountName || undefined,
    secret,
  };
}
