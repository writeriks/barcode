import * as Calendar from 'expo-calendar';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import type { QrContentType } from '../utils/classifyQrContent';
import { buildVCardContent } from '../utils/qrContentBuilders';
import { parseEventFields, parseMeCardFields } from '../utils/qrContentParsers';

/**
 * Hands a scanned event to the calendar, and a scanned contact to a file.
 *
 * The event used to go through a file too, on the reasoning that iOS knows
 * what an .ics is and would offer to add it. It does know — the share
 * sheet even draws the little calendar page with the right date on it —
 * but Calendar registers no share extension, so the sheet offers AirDrop,
 * Messages, Mail and Save to Files and no way to actually add the event.
 * The file was a dead end dressed as a destination.
 *
 * So events go through EventKit, by way of the system's own new-event
 * screen: the app fills it in, the user sees it and confirms. The price is
 * a full calendar permission, because expo-calendar counts iOS 17's
 * add-only grant as a refusal. It is more than this feature needs and it
 * is the only route that works.
 *
 * Contacts still go through a file, and carry the same caveat: Contacts
 * has no share extension either, so the sheet can save or send the .vcf
 * but not add it. Fixing that means expo-contacts and a second permission,
 * which hasn't been decided.
 */

/** Sanitised for a filename and short enough to read in the share sheet,
 *  because the filename is the title iOS shows above the preview. */
function safeFileName(title: string, fallback: string, extension: string): string {
  const cleaned = title
    .replace(/[^\p{L}\p{N} _-]/gu, '')
    .trim()
    .slice(0, 40);
  return `${cleaned || fallback}.${extension}`;
}

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
 * A scanned contact as a .vcf file.
 *
 * MECARD is converted rather than passed through: it is its own format,
 * and iOS has never read it. Going through the app's own parser and vCard
 * builder means a MECARD code lands in Contacts with the same fields a
 * vCard would.
 */
export function toContactFile(content: string, type: QrContentType, title: string): File | null {
  let body = content.trim();
  if (type === 'mecard') {
    const fields = parseMeCardFields(body, null);
    const converted = buildVCardContent({
      version: '3.0',
      title: '',
      firstName: fields.name,
      lastName: '',
      homeDialCode: fields.country?.dialCode ?? '',
      homeNumber: fields.number,
      mobileDialCode: '',
      mobileNumber: '',
      email: fields.email,
      website: fields.website,
      company: fields.company,
      jobTitle: '',
      // MECARD has no office or fax field to carry over.
      officeDialCode: '',
      officeNumber: '',
      faxDialCode: '',
      faxNumber: '',
      address: fields.address,
      city: '',
      state: '',
      postCode: '',
      country: '',
    });
    if (!converted) return null;
    body = converted;
  }

  const file = new File(Paths.cache, safeFileName(title, 'contact', 'vcf'));
  file.create({ overwrite: true });
  file.write(body);
  return file;
}

/**
 * Puts the contact file in front of the user.
 *
 * The UTI is what tells iOS what the file is; without it the sheet treats
 * it as anonymous data and offers only the file-moving apps. With it, the
 * sheet at least previews the contact — though Contacts itself is not a
 * destination there, which is the open question noted at the top.
 */
export async function shareStructuredFile(file: File): Promise<void> {
  await Sharing.shareAsync(file.uri, { UTI: 'public.vcard', mimeType: 'text/vcard' });
}
