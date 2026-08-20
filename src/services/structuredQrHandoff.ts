import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import type { QrContentType } from '../utils/classifyQrContent';
import { buildVCardContent } from '../utils/qrContentBuilders';
import { parseMeCardFields } from '../utils/qrContentParsers';

/**
 * Hands a scanned event or contact to iOS as a file it already knows.
 *
 * There is no URL scheme for "make this calendar event" or "add this
 * contact", and the APIs that would do it directly — EventKit, Contacts —
 * both want a permission prompt for the whole address book or calendar,
 * which is a large thing to ask in order to add one entry the user is
 * already looking at.
 *
 * A file needs none of that. iOS recognises .ics and .vcf on sight and
 * offers to add them to Calendar or Contacts itself, with its own preview
 * and its own confirmation. It costs one more tap than a direct write, and
 * saves a permission the app would otherwise have to justify to a
 * reviewer and to the user.
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

/**
 * A scanned event as an .ics file.
 *
 * Codes this app writes are already whole calendar objects, but plenty of
 * generators emit a bare VEVENT — which is a component of a calendar
 * rather than a document, and is exactly what iOS refuses to do anything
 * useful with. Anything arriving without the wrapper gets one, so a code
 * from elsewhere opens as well as one of ours.
 */
export function toCalendarFile(content: string, title: string): File {
  const trimmed = content.trim();
  const body = /BEGIN:VCALENDAR/i.test(trimmed)
    ? trimmed
    : ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Blippo//QR Event//EN', trimmed, 'END:VCALENDAR'].join('\r\n');

  const file = new File(Paths.cache, safeFileName(title, 'event', 'ics'));
  file.create({ overwrite: true });
  file.write(body);
  return file;
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
 * Puts the file in front of the user.
 *
 * The UTI is what decides whether iOS offers Calendar and Contacts at all
 * — without it the sheet treats the file as anonymous data and offers only
 * the file-moving apps.
 */
export async function shareStructuredFile(file: File, kind: 'event' | 'contact'): Promise<void> {
  const isEvent = kind === 'event';
  await Sharing.shareAsync(file.uri, {
    UTI: isEvent ? 'com.apple.ical.ics' : 'public.vcard',
    mimeType: isEvent ? 'text/calendar' : 'text/vcard',
  });
}
