/**
 * Things worth pointing out about a scanned link, worked out on the device
 * from the URL itself.
 *
 * Deliberately not a reputation check. A real one means sending every URL
 * the user scans to Google Safe Browsing or similar, which is a network
 * call, a privacy policy change and a data-collection disclosure — for a
 * verdict that is still only as fresh as someone else's blocklist. What
 * this does instead is name the tricks that are visible in the address:
 * the ones a person could spot themselves if they knew to look, and that
 * a QR code exists precisely to hide.
 *
 * So it never says "safe". It says "here is what you can't see", and the
 * user decides.
 */
export type UrlWarning =
  | 'notEncrypted'
  | 'punycode'
  | 'ipAddress'
  | 'embeddedCredentials'
  | 'shortener'
  | 'manySubdomains';

/** URL shorteners common enough to be worth naming. The point isn't that
 * these are dangerous — it's that a shortened link inside a QR code hides
 * the destination twice over. */
const SHORTENER_HOSTS = new Set([
  'bit.ly',
  'buff.ly',
  'cutt.ly',
  'goo.gl',
  'is.gd',
  'ow.ly',
  'rb.gy',
  'rebrand.ly',
  's.id',
  'shorturl.at',
  't.co',
  't.ly',
  'tiny.cc',
  'tinyurl.com',
  'v.gd',
]);

/** Enough dots to be hiding the real domain at the end of a long prefix,
 * e.g. `apple.com.account-verify.example.net`. Three labels is ordinary
 * (`www.example.co.uk`); past that is worth a look. */
const SUBDOMAIN_LIMIT = 4;

const IPV4 = /^\d{1,3}(\.\d{1,3}){3}$/;

/** Parses only what a browser would treat as a web address. Anything else
 * — a wifi payload, a vCard, plain text — has no host to reason about. */
function parseWebUrl(value: string): URL | null {
  try {
    const url = new URL(value.trim());
    return url.protocol === 'http:' || url.protocol === 'https:' ? url : null;
  } catch {
    return null;
  }
}

/**
 * What's worth flagging about this link, or an empty list when there's
 * nothing to say. An empty list is not a clean bill of health — see the
 * note at the top of this file.
 */
export function inspectUrl(value: string): UrlWarning[] {
  const url = parseWebUrl(value);
  if (!url) return [];

  const warnings: UrlWarning[] = [];
  const host = url.hostname.toLowerCase();

  if (url.protocol === 'http:') warnings.push('notEncrypted');

  // `xn--` is how a non-Latin domain is encoded, and how a domain that
  // *looks* Latin can be built out of another alphabet's lookalike
  // letters. One check covers both: `URL` punycodes the hostname itself,
  // so a Cyrillic "аpple.com" arrives here already spelled `xn--`.
  if (host.split('.').some((label) => label.startsWith('xn--'))) warnings.push('punycode');

  if (IPV4.test(host) || host.startsWith('[')) warnings.push('ipAddress');

  // `https://apple.com@evil.example` goes to evil.example — everything
  // before the @ is a username, not the destination.
  if (url.username || url.password) warnings.push('embeddedCredentials');

  if (SHORTENER_HOSTS.has(host) || SHORTENER_HOSTS.has(host.replace(/^www\./, ''))) {
    warnings.push('shortener');
  }

  if (host.split('.').length > SUBDOMAIN_LIMIT) warnings.push('manySubdomains');

  return warnings;
}
