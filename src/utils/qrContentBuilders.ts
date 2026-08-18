/** Turns a My Codes generator form's fields into the actual string that
 * gets encoded into the QR — the inverse of classifyQrContent/
 * resolveQrOpenUri, which read this same shape back out of a scanned code.
 * Each builder returns null when the form doesn't have enough to produce a
 * meaningful code yet, so the screen can disable Save until it does. */

function buildQuery(params: Record<string, string>): string {
  const pairs = Object.entries(params)
    .filter(([, value]) => value.trim().length > 0)
    .map(([key, value]) => `${key}=${encodeURIComponent(value.trim())}`);
  return pairs.length > 0 ? `?${pairs.join('&')}` : '';
}

/** Keeps only digits — dial codes and typed phone numbers routinely carry
 * spaces, dashes, or parentheses that don't belong in a tel:/sms: URI. */
function onlyDigits(value: string): string {
  return value.replace(/\D/g, '');
}

export function buildLinkContent(url: string): string | null {
  const trimmed = url.trim();
  if (!trimmed) return null;
  return /^[a-z][a-z0-9+.-]*:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
}

export function buildTextContent(message: string): string | null {
  const trimmed = message.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export function buildEmailContent(fields: { to: string; subject: string; body: string }): string | null {
  const to = fields.to.trim();
  if (!to) return null;
  return `mailto:${to}${buildQuery({ subject: fields.subject, body: fields.body })}`;
}

export function buildPhoneContent(fields: { dialCode: string; number: string }): string | null {
  const number = onlyDigits(fields.number);
  if (!number) return null;
  return `tel:${fields.dialCode}${number}`;
}

export function buildSmsContent(fields: { dialCode: string; number: string; message: string }): string | null {
  const number = onlyDigits(fields.number);
  if (!number) return null;
  return `sms:${fields.dialCode}${number}${buildQuery({ body: fields.message })}`;
}

export function buildWhatsAppContent(fields: { dialCode: string; number: string; message: string }): string | null {
  const number = onlyDigits(fields.number);
  if (!number) return null;
  return `https://wa.me/${onlyDigits(fields.dialCode)}${number}${buildQuery({ text: fields.message })}`;
}

export function buildZoomContent(fields: { meetingId: string; password: string }): string | null {
  const meetingId = onlyDigits(fields.meetingId);
  if (!meetingId) return null;
  return `https://zoom.us/j/${meetingId}${buildQuery({ pwd: fields.password })}`;
}

/** Shared by the Facebook/Instagram/Twitter/Spotify/Viber generators —
 * all five just need a profile/track URL, built from either a bare
 * username or a full link the user pastes in directly. */
export function buildSocialProfileContent(profileBaseUrl: string, value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (/^[a-z][a-z0-9+.-]*:\/\//i.test(trimmed)) return trimmed;
  return `${profileBaseUrl}${trimmed.replace(/^@/, '')}`;
}

export type WifiNetworkType = 'WEP' | 'WPA' | 'nopass';

/** WIFI: field values need `\`, `;`, `,`, `"` backslash-escaped — those
 * characters are the payload's own field/record separators. */
function escapeWifiField(value: string): string {
  return value.replace(/([\\;,"])/g, '\\$1');
}

export function buildWifiContent(fields: {
  ssid: string;
  networkType: WifiNetworkType;
  password: string;
  hidden: boolean;
}): string | null {
  const ssid = fields.ssid.trim();
  if (!ssid) return null;
  const password =
    fields.networkType === 'nopass' ? '' : `P:${escapeWifiField(fields.password.trim())};`;
  return `WIFI:T:${fields.networkType};S:${escapeWifiField(ssid)};${password}H:${fields.hidden ? 'true' : 'false'};;`;
}

/** vCard/iCalendar TEXT values share the same escaping rule: a literal
 * backslash, semicolon, or comma would otherwise be read as the format's
 * own structure, and a raw newline isn't allowed inside one line. */
function escapeStructuredText(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n');
}

export interface VCardFormFields {
  version: '2.1' | '3.0';
  title: string;
  firstName: string;
  lastName: string;
  homeDialCode: string;
  homeNumber: string;
  mobileDialCode: string;
  mobileNumber: string;
  email: string;
  website: string;
  company: string;
  jobTitle: string;
  officeDialCode: string;
  officeNumber: string;
  faxDialCode: string;
  faxNumber: string;
  address: string;
  postCode: string;
  city: string;
  state: string;
  country: string;
}

function vcardPhoneLine(kind: string, dialCode: string, number: string): string | null {
  const digits = onlyDigits(number);
  return digits ? `TEL;${kind}:${dialCode}${digits}` : null;
}

export function buildVCardContent(fields: VCardFormFields): string | null {
  const title = fields.title.trim();
  const firstName = fields.firstName.trim();
  const lastName = fields.lastName.trim();
  const company = fields.company.trim();
  if (!firstName && !lastName && !company) return null;

  const lines = ['BEGIN:VCARD', `VERSION:${fields.version}`];
  lines.push(`N:${escapeStructuredText(lastName)};${escapeStructuredText(firstName)};;${escapeStructuredText(title)};`);
  const fullName = [title, firstName, lastName].filter(Boolean).join(' ');
  lines.push(`FN:${escapeStructuredText(fullName || company)}`);
  if (company) lines.push(`ORG:${escapeStructuredText(company)}`);
  if (fields.jobTitle.trim()) lines.push(`TITLE:${escapeStructuredText(fields.jobTitle.trim())}`);

  for (const phone of [
    vcardPhoneLine('HOME', fields.homeDialCode, fields.homeNumber),
    vcardPhoneLine('CELL', fields.mobileDialCode, fields.mobileNumber),
    vcardPhoneLine('WORK', fields.officeDialCode, fields.officeNumber),
    vcardPhoneLine('FAX', fields.faxDialCode, fields.faxNumber),
  ]) {
    if (phone) lines.push(phone);
  }

  if (fields.email.trim()) lines.push(`EMAIL:${fields.email.trim()}`);
  if (fields.website.trim()) lines.push(`URL:${fields.website.trim()}`);

  const hasAddress = [fields.address, fields.city, fields.state, fields.postCode, fields.country].some(
    (value) => value.trim().length > 0
  );
  if (hasAddress) {
    const [address, city, state, postCode, country] = [
      fields.address,
      fields.city,
      fields.state,
      fields.postCode,
      fields.country,
    ].map((value) => escapeStructuredText(value.trim()));
    lines.push(`ADR;HOME:;;${address};${city};${state};${postCode};${country}`);
  }

  lines.push('END:VCARD');
  return lines.join('\n');
}

/**
 * A place, as an Apple Maps link.
 *
 * `geo:` is the obvious encoding and the wrong one here: iOS registers no
 * handler for it, so a code holding one is scanned by the Camera app and
 * simply does nothing. This app is for iOS, and a QR that opens Maps is
 * the point of a location code — so it encodes the link that does that.
 * Scanned `geo:` codes are still understood; see classifyQrContent.
 */
export function buildLocationContent(fields: { latitude: string; longitude: string }): string | null {
  const latitude = fields.latitude.trim();
  const longitude = fields.longitude.trim();
  if (!latitude || !longitude || Number.isNaN(Number(latitude)) || Number.isNaN(Number(longitude))) return null;
  return `https://maps.apple.com/?ll=${latitude},${longitude}&q=${latitude},${longitude}`;
}

export interface MeCardFormFields {
  name: string;
  dialCode: string;
  number: string;
  email: string;
  company: string;
  address: string;
  website: string;
}

/** MECARD's fields aren't escaped the way vCard/iCalendar's are — the
 * format has no defined escaping rule, so generators (and our own parser)
 * just treat `;` as a plain separator and expect field values to avoid it. */
export function buildMeCardContent(fields: MeCardFormFields): string | null {
  const name = fields.name.trim();
  if (!name) return null;

  const parts = [`N:${name}`];
  const digits = onlyDigits(fields.number);
  if (digits) parts.push(`TEL:${fields.dialCode}${digits}`);
  if (fields.email.trim()) parts.push(`EMAIL:${fields.email.trim()}`);
  if (fields.company.trim()) parts.push(`ORG:${fields.company.trim()}`);
  if (fields.address.trim()) parts.push(`ADR:${fields.address.trim()}`);
  if (fields.website.trim()) parts.push(`URL:${fields.website.trim()}`);
  return `MECARD:${parts.join(';')};;`;
}

export function buildUpiContent(fields: {
  vpa: string;
  payeeName: string;
  amount: string;
  note: string;
}): string | null {
  const vpa = fields.vpa.trim();
  if (!vpa) return null;
  return `upi://pay${buildQuery({ pa: vpa, pn: fields.payeeName, am: fields.amount, tn: fields.note })}`;
}

export interface EventFormFields {
  title: string;
  location: string;
  startTime: Date | null;
  endTime: Date | null;
  /** Minutes before the event for a VALARM reminder, or '' for none. */
  reminderMinutes: string;
  link: string;
  notes: string;
}

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

/** Formats as a floating (no timezone/UTC suffix) local date-time, per the
 * iCalendar TEXT-DATETIME form — good enough here since these are
 * one-device-authored events, not calendar invites synced across timezones. */
function toIcsDateTime(date: Date): string {
  return `${date.getFullYear()}${pad2(date.getMonth() + 1)}${pad2(date.getDate())}T${pad2(date.getHours())}${pad2(date.getMinutes())}00`;
}

/** A UTC stamp, which is the only form DTSTAMP is allowed to take. */
function toIcsUtcDateTime(date: Date): string {
  return `${date.getUTCFullYear()}${pad2(date.getUTCMonth() + 1)}${pad2(date.getUTCDate())}T${pad2(date.getUTCHours())}${pad2(date.getUTCMinutes())}00Z`;
}

/**
 * A short, stable id for the event's own fields.
 *
 * UID has to identify the event, and it also has to be the same every time
 * the same event is built: the form rebuilds its content on every
 * keystroke, and a random id would redraw the code — and change what gets
 * saved — for no reason. Derived from the fields, so editing the event
 * gives it a new id and re-editing it back gives the old one.
 */
function eventUid(seed: string): string {
  let hash = 0x811c9dc5;
  for (let index = 0; index < seed.length; index += 1) {
    hash ^= seed.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return `${hash.toString(36)}@blippo.app`;
}

/**
 * An event, as a whole calendar object.
 *
 * A bare VEVENT is what most QR generators emit and what this used to
 * emit, and iOS does nothing useful with it — scanning one showed the raw
 * BEGIN:VEVENT text rather than an "Add to Calendar" offer. A VEVENT is a
 * component of a calendar, not a document; wrapped in VCALENDAR with the
 * VERSION and PRODID that makes it a valid one, and given the UID and
 * DTSTAMP the spec requires of every event, the same data is recognized.
 */
export function buildEventContent(fields: EventFormFields): string | null {
  const title = fields.title.trim();
  const startDate = fields.startTime;
  if (!title || !startDate) return null;
  const start = toIcsDateTime(startDate);

  // An end before the start is a nonsense event that calendars either
  // reject or silently rewrite, and it's an easy thing to leave behind
  // when moving the start later. Dropped rather than corrected: an event
  // with no end is an ordinary thing, an invented one is a guess.
  const end = fields.endTime && fields.endTime > startDate ? toIcsDateTime(fields.endTime) : null;

  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Blippo//QR Event//EN',
    'BEGIN:VEVENT',
    `UID:${eventUid(`${title}|${start}|${end ?? ''}`)}`,
    // The event's own start rather than the moment of writing, so building
    // the same event twice gives the same code.
    `DTSTAMP:${toIcsUtcDateTime(startDate)}`,
    `SUMMARY:${escapeStructuredText(title)}`,
  ];
  if (fields.location.trim()) lines.push(`LOCATION:${escapeStructuredText(fields.location.trim())}`);
  lines.push(`DTSTART:${start}`);
  if (end) lines.push(`DTEND:${end}`);
  if (fields.link.trim()) lines.push(`URL:${fields.link.trim()}`);
  if (fields.notes.trim()) lines.push(`DESCRIPTION:${escapeStructuredText(fields.notes.trim())}`);
  if (fields.reminderMinutes) {
    lines.push(
      'BEGIN:VALARM',
      `TRIGGER:-PT${fields.reminderMinutes}M`,
      'ACTION:DISPLAY',
      `DESCRIPTION:${escapeStructuredText(title)}`,
      'END:VALARM'
    );
  }
  lines.push('END:VEVENT', 'END:VCALENDAR');
  // CRLF, which is what RFC 5545 calls a line break. iOS is forgiving
  // about it and other readers are not.
  return lines.join('\r\n');
}
