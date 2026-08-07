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

export interface EventFormFields {
  title: string;
  location: string;
  /** "YYYY-MM-DD HH:mm", local time — kept as plain text input rather than
   * a native date picker for now. */
  startTime: string;
  endTime: string;
  /** Minutes before the event for a VALARM reminder, or '' for none. */
  reminderMinutes: string;
  link: string;
  notes: string;
}

function toIcsDateTime(value: string): string | null {
  const match = value.trim().match(/^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})$/);
  if (!match) return null;
  const [, year, month, day, hour, minute] = match;
  return `${year}${month}${day}T${hour}${minute}00`;
}

export function buildEventContent(fields: EventFormFields): string | null {
  const title = fields.title.trim();
  const start = toIcsDateTime(fields.startTime);
  if (!title || !start) return null;

  const lines = ['BEGIN:VEVENT', `SUMMARY:${escapeStructuredText(title)}`];
  if (fields.location.trim()) lines.push(`LOCATION:${escapeStructuredText(fields.location.trim())}`);
  lines.push(`DTSTART:${start}`);
  const end = toIcsDateTime(fields.endTime);
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
  lines.push('END:VEVENT');
  return lines.join('\n');
}
