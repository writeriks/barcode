import * as Calendar from 'expo-calendar';
import * as Contacts from 'expo-contacts';
import type { QrContentType } from '../utils/classifyQrContent';
import type { CountryCallingCode } from '../utils/countryCallingCodes';
import {
  joinDialledNumber,
  parseEventFields,
  parseMeCardFields,
  parseVCardFields,
  splitMeCardName,
} from '../utils/qrContentParsers';

/**
 * Hands a scanned event to the calendar and a scanned contact to Contacts.
 *
 * Both used to go out as a file — an .ics, a .vcf — on the reasoning that
 * iOS knows those formats and would offer to add them. It does know them:
 * the share sheet even draws the little calendar page with the right date
 * on it. But neither Calendar nor Contacts registers a share extension, so
 * the sheet offers AirDrop, Messages, Mail and Save to Files and no way to
 * actually add anything. The file was a dead end dressed as a destination.
 *
 * So both now go through the system's own screens: the app fills one in,
 * the user sees it and saves it. Nothing is written without that.
 *
 * The price is two permissions that are wider than what the app does with
 * them — expo-calendar counts iOS 17's add-only calendar grant as a
 * refusal, and contacts has never had an add-only grant at all. That is
 * the cost of the only route that works, and it is why neither prompt is
 * raised until someone actually taps the button.
 */

/** An event with no end time still needs one; an hour is what a calendar
 *  assumes when a person makes an event by hand. */
const DEFAULT_DURATION_MS = 60 * 60 * 1000;

export type AddEventResult = 'added' | 'dismissed' | 'denied' | 'unreadable';

/**
 * Opens the system's new-event screen, filled in from a scanned code.
 *
 * The screen is iOS's own: the user sees the event, can change any of it,
 * and confirms. Nothing is written without that confirmation, which is
 * what makes asking for the permission defensible — the app never quietly
 * adds anything.
 *
 * The reminder in the code becomes an alarm on the event, which is where
 * that field was always heading: this app schedules no notifications, it
 * only ever asked a calendar to.
 */
export async function addEventToCalendar(content: string): Promise<AddEventResult> {
  const fields = parseEventFields(content);
  if (!fields.startTime || !fields.title.trim()) return 'unreadable';

  const { granted } = await Calendar.requestCalendarPermissionsAsync();
  if (!granted) return 'denied';

  const reminder = Number(fields.reminderMinutes);
  const result = await Calendar.createEventInCalendarAsync({
    title: fields.title.trim(),
    startDate: fields.startTime,
    endDate: fields.endTime ?? new Date(fields.startTime.getTime() + DEFAULT_DURATION_MS),
    location: fields.location.trim(),
    notes: fields.notes.trim(),
    url: fields.link.trim() || undefined,
    alarms: Number.isFinite(reminder) && fields.reminderMinutes !== ''
      ? [{ relativeOffset: -reminder }]
      : [],
  });

  // 'saved' is the confirmation; 'done' comes back when the screen closed
  // without one, which for a brand new event means nothing was added.
  return result.action === 'saved' ? 'added' : 'dismissed';
}

/**
 * Contacts labels its fields with these rather than with words.
 *
 * `_$!<Home>!$_` and friends are the Contacts framework's own label
 * constants, and they are what makes a number show up as Cep on a Turkish
 * phone and Mobile on an English one. expo-contacts takes a label already
 * translated into the device's language and maps it back to a constant, so
 * passing the English word would work on an English phone and leave a
 * literal "mobile" as a custom label on every other one. The constants go
 * through its mapping untouched (see decodeLabel in the module's
 * Serialization.swift) and land where they belong in every language.
 */
const LABEL = {
  home: '_$!<Home>!$_',
  work: '_$!<Work>!$_',
  mobile: '_$!<Mobile>!$_',
  workFax: '_$!<WorkFAX>!$_',
  homePage: '_$!<HomePage>!$_',
} as const;

export type AddContactResult = 'shown' | 'denied' | 'unreadable';

function phone(label: string, dialCode: string | undefined, number: string): Contacts.PhoneNumber | null {
  const dialled = joinDialledNumber(dialCode, number);
  return dialled ? { label, number: dialled } : null;
}

function compact<T>(values: (T | null)[]): T[] | undefined {
  const kept = values.filter((value): value is T => value !== null);
  return kept.length ? kept : undefined;
}

function toContact(content: string, type: QrContentType, defaultCountry: CountryCallingCode | null): Contacts.Contact | null {
  if (type === 'mecard') {
    const fields = parseMeCardFields(content, defaultCountry);
    const { firstName, lastName } = splitMeCardName(fields.name);
    if (!firstName && !lastName && !fields.company.trim()) return null;
    return {
      contactType: Contacts.ContactTypes.Person,
      name: [firstName, lastName].filter(Boolean).join(' '),
      firstName,
      lastName,
      company: fields.company.trim(),
      // MECARD has no way to say what kind of number it carries.
      phoneNumbers: compact([phone(LABEL.mobile, fields.country?.dialCode, fields.number)]),
      emails: fields.email.trim() ? [{ label: LABEL.home, email: fields.email.trim() }] : undefined,
      urlAddresses: fields.website.trim() ? [{ label: LABEL.homePage, url: fields.website.trim() }] : undefined,
      // One free-text line; there are no separate city or postcode fields
      // to fill from, so it goes in as the street.
      addresses: fields.address.trim() ? [{ label: LABEL.home, street: fields.address.trim() }] : undefined,
    };
  }

  const fields = parseVCardFields(content, defaultCountry);
  const firstName = fields.firstName.trim();
  const lastName = fields.lastName.trim();
  const company = fields.company.trim();
  if (!firstName && !lastName && !company) return null;

  const address = [fields.address, fields.city, fields.state, fields.postCode, fields.country]
    .map((part) => part.trim())
    .filter(Boolean);

  return {
    // A card with no person on it is a company card, and Contacts has a
    // shape for exactly that — it shows the organisation as the name.
    contactType: firstName || lastName ? Contacts.ContactTypes.Person : Contacts.ContactTypes.Company,
    name: [firstName, lastName].filter(Boolean).join(' ') || company,
    firstName,
    lastName,
    // vCard's N carries the prefix — Dr., Prof. — in its fourth part.
    namePrefix: fields.title.trim(),
    company,
    jobTitle: fields.jobTitle.trim(),
    phoneNumbers: compact([
      phone(LABEL.mobile, fields.mobileCountry?.dialCode, fields.mobileNumber),
      phone(LABEL.home, fields.homeCountry?.dialCode, fields.homeNumber),
      phone(LABEL.work, fields.officeCountry?.dialCode, fields.officeNumber),
      phone(LABEL.workFax, fields.faxCountry?.dialCode, fields.faxNumber),
    ]),
    emails: fields.email.trim() ? [{ label: LABEL.work, email: fields.email.trim() }] : undefined,
    urlAddresses: fields.website.trim() ? [{ label: LABEL.homePage, url: fields.website.trim() }] : undefined,
    addresses: address.length
      ? [
          {
            label: LABEL.work,
            street: fields.address.trim(),
            city: fields.city.trim(),
            region: fields.state.trim(),
            postalCode: fields.postCode.trim(),
            country: fields.country.trim(),
          },
        ]
      : undefined,
  };
}

/**
 * Opens the system's new-contact screen, filled in from a scanned card.
 *
 * The same bargain the calendar makes: the app fills the fields in, the
 * screen is iOS's own, and the user is the one who taps Done. The promise
 * resolves when that screen closes and says nothing about which button
 * closed it, so the result stops at 'shown' — the user watched what
 * happened and does not need telling.
 *
 * MECARD is read by the app's own parser rather than handed over as-is:
 * it is a format of its own and iOS has never understood it, so a MECARD
 * code lands in Contacts with the same fields a vCard would.
 */
export async function addContactToDevice(
  content: string,
  type: QrContentType,
  defaultCountry: CountryCallingCode | null
): Promise<AddContactResult> {
  const contact = toContact(content, type, defaultCountry);
  if (!contact) return 'unreadable';

  const { granted } = await Contacts.requestPermissionsAsync();
  if (!granted) return 'denied';

  await Contacts.presentFormAsync(null, contact, { isNew: true });
  return 'shown';
}
