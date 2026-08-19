/** The inverse of qrContentBuilders — turns a saved My Code's raw content
 * string back into a generator form's fields, so editing an existing code
 * can reopen the same structured form it was created with instead of a
 * raw-text box. Every parser is best-effort: unparseable/legacy content
 * (e.g. freeform text saved before typed forms existed) falls back to
 * that type's defaults rather than throwing. */

import { defaultEmailFields, type EmailFields } from '../components/qrForms/EmailForm';
import { defaultEventFields, type EventFields } from '../components/qrForms/EventForm';
import { defaultLinkFields, type LinkFields } from '../components/qrForms/LinkForm';
import { defaultLocationFields, type LocationFields } from '../components/qrForms/LocationForm';
import { defaultMeCardFields, type MeCardFields } from '../components/qrForms/MeCardForm';
import { defaultPhoneFields, type PhoneFields } from '../components/qrForms/PhoneForm';
import { defaultPhoneMessageFields, type PhoneMessageFields } from '../components/qrForms/PhoneMessageForm';
import { type SocialFields } from '../components/qrForms/SocialProfileForm';
import { defaultTextFields, type TextFields } from '../components/qrForms/TextForm';
import { defaultUpiFields, type UpiFields } from '../components/qrForms/UpiForm';
import { defaultVCardFields, type VCardFields } from '../components/qrForms/VCardForm';
import { defaultWifiFields, type WifiFields } from '../components/qrForms/WifiForm';
import { defaultZoomFields, type ZoomFields } from '../components/qrForms/ZoomForm';
import { COUNTRY_CALLING_CODES, type CountryCallingCode } from './countryCallingCodes';
import { extractCoordinates } from './mapLinks';

function decodeSafely(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function parseQueryString(query: string): Record<string, string> {
  const result: Record<string, string> = {};
  for (const pair of query.split('&')) {
    if (!pair) continue;
    const eqIndex = pair.indexOf('=');
    const key = eqIndex === -1 ? pair : pair.slice(0, eqIndex);
    const value = eqIndex === -1 ? '' : pair.slice(eqIndex + 1);
    result[decodeSafely(key)] = decodeSafely(value);
  }
  return result;
}

/** Splits a URL's `?query` off its head, decoding neither — callers pick
 * apart the head themselves (it's not always plain text, e.g. a phone
 * number). */
function splitQuery(value: string): [string, string] {
  const index = value.indexOf('?');
  return index === -1 ? [value, ''] : [value.slice(0, index), value.slice(index + 1)];
}

/** Matches a run of digits against the longest known dial code prefix —
 * dial codes are ambiguous by nature (+1, +7 are shared by several
 * countries), so this is a best-effort split good enough to pre-fill an
 * edit form the user can still correct via the country picker. */
function splitDialCode(raw: string, defaultCountry: CountryCallingCode | null): { country: CountryCallingCode | null; number: string } {
  const digits = raw.replace(/\D/g, '');
  let best: CountryCallingCode | null = null;
  let bestLength = 0;
  for (const candidate of COUNTRY_CALLING_CODES) {
    const candidateDigits = candidate.dialCode.replace(/\D/g, '');
    if (digits.startsWith(candidateDigits) && candidateDigits.length > bestLength) {
      best = candidate;
      bestLength = candidateDigits.length;
    }
  }
  if (!best) return { country: defaultCountry, number: digits };
  return { country: best, number: digits.slice(bestLength) };
}

/** Splits on an unescaped separator, keeping each part's escape sequences
 * intact for the caller to unescape — shared by WIFI: fields and vCard/
 * iCalendar structured lines (N:, ADR:), which both escape `;` this way. */
function splitEscaped(value: string, separator: string): string[] {
  const parts: string[] = [];
  let current = '';
  for (let i = 0; i < value.length; i++) {
    const ch = value[i];
    if (ch === '\\' && i + 1 < value.length) {
      current += ch + value[i + 1];
      i++;
    } else if (ch === separator) {
      parts.push(current);
      current = '';
    } else {
      current += ch;
    }
  }
  parts.push(current);
  return parts;
}

function unescapeWifiField(value: string): string {
  return value.replace(/\\([\\;,"])/g, '$1');
}

function unescapeStructuredText(value: string): string {
  return value.replace(/\\\\|\\;|\\,|\\n/g, (match) => {
    switch (match) {
      case '\\\\':
        return '\\';
      case '\\;':
        return ';';
      case '\\,':
        return ',';
      default:
        return '\n';
    }
  });
}

export function parseLinkFields(content: string): LinkFields {
  return { url: content };
}

export function parseTextFields(content: string): TextFields {
  return { message: content };
}

export function parseEmailFields(content: string): EmailFields {
  const match = content.match(/^mailto:([^?]*)(?:\?(.*))?$/i);
  if (!match) return { ...defaultEmailFields };
  const params = parseQueryString(match[2] ?? '');
  return { to: decodeSafely(match[1] ?? ''), subject: params.subject ?? '', body: params.body ?? '' };
}

export function parsePhoneFields(content: string, defaultCountry: CountryCallingCode | null): PhoneFields {
  const match = content.match(/^tel:(.+)$/i);
  if (!match) return defaultPhoneFields(defaultCountry);
  const { country, number } = splitDialCode(match[1], defaultCountry);
  return { country, number };
}

function parsePhoneMessageFields(
  content: string,
  pattern: RegExp,
  bodyParam: string,
  defaultCountry: CountryCallingCode | null
): PhoneMessageFields {
  const match = content.match(pattern);
  if (!match) return defaultPhoneMessageFields(defaultCountry);
  const [head, query] = splitQuery(match[1]);
  const { country, number } = splitDialCode(head, defaultCountry);
  const params = parseQueryString(query);
  return { country, number, message: params[bodyParam] ?? '' };
}

export function parseSmsFields(content: string, defaultCountry: CountryCallingCode | null): PhoneMessageFields {
  return parsePhoneMessageFields(content, /^sms:(.+)$/i, 'body', defaultCountry);
}

export function parseWhatsappFields(content: string, defaultCountry: CountryCallingCode | null): PhoneMessageFields {
  return parsePhoneMessageFields(content, /^https:\/\/wa\.me\/(.+)$/i, 'text', defaultCountry);
}

/** The stored content is always a full URL (buildSocialProfileContent
 * either passes a pasted URL through as-is or prefixes a bare username
 * into one), so it round-trips straight back into the field unchanged. */
export function parseSocialProfileFields(content: string): SocialFields {
  return { value: content };
}

export function parseZoomFields(content: string): ZoomFields {
  const match = content.match(/^https:\/\/zoom\.us\/j\/(.+)$/i);
  if (!match) return { ...defaultZoomFields };
  const [meetingId, query] = splitQuery(match[1]);
  const params = parseQueryString(query);
  return { meetingId, password: params.pwd ?? '' };
}

/** A short link hides its coordinates behind a redirect, so the form is
 *  left empty rather than filled in wrong. */
export function parseLocationFields(content: string): LocationFields {
  return extractCoordinates(content) ?? { ...defaultLocationFields };
}

export function parseUpiFields(content: string): UpiFields {
  const match = content.match(/^upi:\/\/pay\?(.*)$/i);
  if (!match) return { ...defaultUpiFields };
  const params = parseQueryString(match[1]);
  return { vpa: params.pa ?? '', payeeName: params.pn ?? '', amount: params.am ?? '', note: params.tn ?? '' };
}

/** MECARD fields aren't backslash-escaped (see buildMeCardContent), so
 * unlike extractWifiFields this is a plain `;`-split. */
function extractMeCardFields(body: string): Record<string, string> {
  const result: Record<string, string> = {};
  for (const segment of body.split(';')) {
    const colonIndex = segment.indexOf(':');
    if (colonIndex === -1) continue;
    result[segment.slice(0, colonIndex)] = segment.slice(colonIndex + 1);
  }
  return result;
}

export function parseMeCardFields(content: string, defaultCountry: CountryCallingCode | null): MeCardFields {
  const result = defaultMeCardFields(defaultCountry);
  if (!/^MECARD:/i.test(content)) return result;
  const raw = extractMeCardFields(content.replace(/^MECARD:/i, '').replace(/;;\s*$/, ''));
  result.name = raw.N ?? '';
  if (raw.TEL) {
    const { country, number } = splitDialCode(raw.TEL, defaultCountry);
    result.country = country;
    result.number = number;
  }
  result.email = raw.EMAIL ?? '';
  result.company = raw.ORG ?? '';
  result.address = raw.ADR ?? '';
  result.website = raw.URL ?? '';
  return result;
}

function extractWifiFields(body: string): Record<string, string> {
  const result: Record<string, string> = {};
  for (const segment of splitEscaped(body, ';')) {
    const colonIndex = segment.indexOf(':');
    if (colonIndex === -1) continue;
    result[segment.slice(0, colonIndex)] = unescapeWifiField(segment.slice(colonIndex + 1));
  }
  return result;
}

export function parseWifiFields(content: string): WifiFields {
  if (!/^WIFI:/i.test(content)) return { ...defaultWifiFields };
  const raw = extractWifiFields(content.slice(content.indexOf(':') + 1));
  const networkType = raw.T === 'WEP' || raw.T === 'WPA' || raw.T === 'nopass' ? raw.T : 'WPA';
  return { ssid: raw.S ?? '', networkType, password: raw.P ?? '', hidden: raw.H === 'true' };
}

export function parseVCardFields(content: string, defaultCountry: CountryCallingCode | null): VCardFields {
  const result = defaultVCardFields(defaultCountry);
  if (!content.includes('BEGIN:VCARD')) return result;

  for (const line of content.split(/\r?\n/)) {
    const colonIndex = line.indexOf(':');
    if (colonIndex === -1) continue;
    const [key, param] = line.slice(0, colonIndex).split(';');
    const value = line.slice(colonIndex + 1);

    switch (key) {
      case 'VERSION': {
        const trimmedVersion = value.trim();
        if (trimmedVersion === '2.1' || trimmedVersion === '3.0') result.version = trimmedVersion;
        break;
      }
      case 'N': {
        const [lastName, firstName, , title] = splitEscaped(value, ';').map(unescapeStructuredText);
        result.lastName = lastName ?? '';
        result.firstName = firstName ?? '';
        result.title = title ?? '';
        break;
      }
      case 'ORG':
        result.company = unescapeStructuredText(value);
        break;
      case 'TITLE':
        result.jobTitle = unescapeStructuredText(value);
        break;
      case 'TEL': {
        const { country, number } = splitDialCode(value, defaultCountry);
        if (param === 'HOME') Object.assign(result, { homeCountry: country, homeNumber: number });
        else if (param === 'CELL') Object.assign(result, { mobileCountry: country, mobileNumber: number });
        else if (param === 'WORK') Object.assign(result, { officeCountry: country, officeNumber: number });
        else if (param === 'FAX') Object.assign(result, { faxCountry: country, faxNumber: number });
        break;
      }
      case 'EMAIL':
        result.email = value.trim();
        break;
      case 'URL':
        result.website = value.trim();
        break;
      case 'ADR': {
        const [, , address, city, state, postCode, country] = splitEscaped(value, ';').map(unescapeStructuredText);
        result.address = address ?? '';
        result.city = city ?? '';
        result.state = state ?? '';
        result.postCode = postCode ?? '';
        result.country = country ?? '';
        break;
      }
    }
  }

  return result;
}

function fromIcsDateTime(value: string | undefined): Date | null {
  const match = value?.match(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})$/);
  if (!match) return null;
  const [, y, mo, d, h, mi] = match;
  return new Date(Number(y), Number(mo) - 1, Number(d), Number(h), Number(mi));
}

export function parseEventFields(content: string): EventFields {
  const result: EventFields = { ...defaultEventFields };
  if (!content.includes('BEGIN:VEVENT')) return result;

  let inAlarm = false;
  for (const line of content.split(/\r?\n/)) {
    if (line === 'BEGIN:VALARM') {
      inAlarm = true;
      continue;
    }
    if (line === 'END:VALARM') {
      inAlarm = false;
      continue;
    }
    const colonIndex = line.indexOf(':');
    if (colonIndex === -1) continue;
    const key = line.slice(0, colonIndex);
    const value = line.slice(colonIndex + 1);

    if (inAlarm) {
      const match = key === 'TRIGGER' ? value.match(/^-PT(\d+)M$/) : null;
      if (match) result.reminderMinutes = match[1];
      continue;
    }

    switch (key) {
      case 'SUMMARY':
        result.title = unescapeStructuredText(value);
        break;
      case 'LOCATION':
        result.location = unescapeStructuredText(value);
        break;
      case 'DTSTART':
        result.startTime = fromIcsDateTime(value);
        break;
      case 'DTEND':
        result.endTime = fromIcsDateTime(value);
        break;
      case 'URL':
        result.link = value.trim();
        break;
      case 'DESCRIPTION':
        result.notes = unescapeStructuredText(value);
        break;
    }
  }

  return result;
}
