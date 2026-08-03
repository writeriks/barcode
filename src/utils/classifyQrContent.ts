export type QrContentType = 'link' | 'email' | 'phone' | 'otp' | 'text';

/** Local, network-free classification of a decoded QR string — enough to
 * pick the right primary action (Open link / Open email / Call number),
 * not a full QR-payload parser (e.g. WIFI:/vCard formats fall through to
 * "text" for now). */
export function classifyQrContent(data: string): QrContentType {
  const trimmed = data.trim();
  if (/^https?:\/\//i.test(trimmed)) return 'link';
  if (/^mailto:/i.test(trimmed)) return 'email';
  if (/^tel:/i.test(trimmed)) return 'phone';
  if (/^otpauth:\/\//i.test(trimmed)) return 'otp';
  return 'text';
}

/** The URI to hand to Linking.openURL for a given classified value —
 * adds the scheme back if the QR encoded it bare (e.g. just an email
 * address rather than "mailto:..."). */
export function resolveQrOpenUri(data: string, type: QrContentType): string | null {
  const trimmed = data.trim();
  switch (type) {
    case 'link':
      return trimmed;
    case 'email':
      return trimmed.toLowerCase().startsWith('mailto:') ? trimmed : `mailto:${trimmed}`;
    case 'phone':
      return trimmed.toLowerCase().startsWith('tel:') ? trimmed : `tel:${trimmed}`;
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
