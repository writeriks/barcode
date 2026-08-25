import type { QrContentType } from './classifyQrContent';
import type { CountryCallingCode } from './countryCallingCodes';
import {
  joinDialledNumber,
  parseEventFields,
  parseMeCardFields,
  parseVCardFields,
  parseWifiFields,
  splitMeCardName,
} from './qrContentParsers';

export interface QrDetailRow {
  labelKey: string;
  value: string;
  /** Hidden behind a reveal control, the way the OTP secret is. */
  secret?: boolean;
}

export interface QrDetails {
  /** The one line worth reading first — an event's name, a person's, a
   *  network's. Shown larger than the rest. */
  title: string | null;
  rows: QrDetailRow[];
}

/**
 * A scanned structured payload, as something a person can read.
 *
 * Four of the types this app recognises have no URL scheme behind them —
 * an event, a vCard, a MECARD, a Wi-Fi network — so there is no app to
 * hand them to and nothing to "open". They were falling through to the raw
 * decoded value, which for an event means the reader is shown
 * BEGIN:VCALENDAR and a stack of field names. The information is all
 * there; it just isn't being read to them.
 *
 * The parsers this uses are the same ones the generator's edit flow uses
 * to reopen a saved code, so a payload this app can write is a payload it
 * can describe, and payloads from other generators come out as well as
 * their formatting allows.
 *
 * Returns null for everything else, which keeps the raw-value card as the
 * default rather than something to be opted out of.
 */
export function describeQrContent(
  data: string,
  type: QrContentType,
  locale: string,
  /** Only used to fill in a dial code the payload left out; the numbers
   *  shown are whatever the code actually carries. */
  defaultCountry: CountryCallingCode | null
): QrDetails | null {
  switch (type) {
    case 'event':
      return describeEvent(data, locale);
    case 'vcard':
      return describeVCard(data, defaultCountry);
    case 'mecard':
      return describeMeCard(data, defaultCountry);
    case 'wifi':
      return describeWifi(data);
    default:
      return null;
  }
}

function row(labelKey: string, value: string | null | undefined, secret?: boolean): QrDetailRow | null {
  const trimmed = value?.trim();
  return trimmed ? { labelKey, value: trimmed, secret } : null;
}

function compact(rows: (QrDetailRow | null)[]): QrDetailRow[] {
  return rows.filter((entry): entry is QrDetailRow => entry !== null);
}

function formatWhen(date: Date | null, locale: string): string | null {
  if (!date) return null;
  return date.toLocaleString(locale, { dateStyle: 'full', timeStyle: 'short' });
}

/** The reminder is worth stating in words. It is a request to whichever
 *  calendar takes the event, not something this app schedules, and the
 *  wording elsewhere says so. */
function formatReminder(minutes: string): string | null {
  const value = Number(minutes);
  if (!Number.isFinite(value) || minutes === '') return null;
  if (value === 0) return 'qr.eventReminderAtStart';
  if (value % 1440 === 0) return `qr.eventReminderDays|${value / 1440}`;
  if (value % 60 === 0) return `qr.eventReminderHours|${value / 60}`;
  return `qr.eventReminderMinutes|${value}`;
}

function describeEvent(data: string, locale: string): QrDetails {
  const fields = parseEventFields(data);
  const reminder = formatReminder(fields.reminderMinutes);
  return {
    title: fields.title.trim() || null,
    rows: compact([
      row('qr.eventStarts', formatWhen(fields.startTime, locale)),
      row('qr.eventEnds', formatWhen(fields.endTime, locale)),
      row('qr.eventLocation', fields.location),
      // Carries the translation key and its count, joined; the view splits
      // it. A row of plain strings would otherwise have no way to say
      // "in 2 hours" in seven languages.
      reminder ? { labelKey: 'qr.eventReminder', value: reminder } : null,
      row('qr.eventLink', fields.link),
      row('qr.eventNotes', fields.notes),
    ]),
  };
}

function describeVCard(data: string, defaultCountry: CountryCallingCode | null): QrDetails {
  const fields = parseVCardFields(data, defaultCountry);
  const name = [fields.title, fields.firstName, fields.lastName].map((part) => part.trim()).filter(Boolean).join(' ');
  const address = [fields.address, fields.postCode, fields.city, fields.state, fields.country]
    .map((part) => part.trim())
    .filter(Boolean)
    .join(', ');

  return {
    title: name || fields.company.trim() || null,
    rows: compact([
      row('qr.contactJobTitle', fields.jobTitle),
      row('qr.contactCompany', name ? fields.company : ''),
      row('qr.contactMobile', joinDialledNumber(fields.mobileCountry?.dialCode, fields.mobileNumber)),
      row('qr.contactPhone', joinDialledNumber(fields.homeCountry?.dialCode, fields.homeNumber)),
      row('qr.contactOffice', joinDialledNumber(fields.officeCountry?.dialCode, fields.officeNumber)),
      row('qr.contactFax', joinDialledNumber(fields.faxCountry?.dialCode, fields.faxNumber)),
      row('qr.contactEmail', fields.email),
      row('qr.contactWebsite', fields.website),
      row('qr.contactAddress', address),
    ]),
  };
}

function describeMeCard(data: string, defaultCountry: CountryCallingCode | null): QrDetails {
  const fields = parseMeCardFields(data, defaultCountry);
  // Read as a name rather than shown as written, so `N:Doe,John` reads the
  // way the same card reads once it is in Contacts.
  const { firstName, lastName } = splitMeCardName(fields.name);
  return {
    title: [firstName, lastName].filter(Boolean).join(' ') || fields.company.trim() || null,
    rows: compact([
      row('qr.contactCompany', fields.name ? fields.company : ''),
      row('qr.contactPhone', joinDialledNumber(fields.country?.dialCode, fields.number)),
      row('qr.contactEmail', fields.email),
      row('qr.contactWebsite', fields.website),
      row('qr.contactAddress', fields.address),
    ]),
  };
}

const WIFI_SECURITY_LABEL: Record<string, string> = {
  WPA: 'qr.wifiSecurityWpa',
  WEP: 'qr.wifiSecurityWep',
  nopass: 'qr.wifiSecurityOpen',
};

function describeWifi(data: string): QrDetails {
  const fields = parseWifiFields(data);
  return {
    title: fields.ssid.trim() || null,
    rows: compact([
      row('qr.wifiSecurity', WIFI_SECURITY_LABEL[fields.networkType] ?? fields.networkType),
      // Masked by default. A network password on screen in a café is the
      // one value here worth hiding until asked for.
      row('qr.wifiPassword', fields.password, true),
      fields.hidden ? { labelKey: 'qr.wifiHidden', value: 'qr.wifiHiddenYes' } : null,
    ]),
  };
}
