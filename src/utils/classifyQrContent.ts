export type QrContentType = 'link' | 'email' | 'phone' | 'text';

/** Local, network-free classification of a decoded QR string — enough to
 * pick the right primary action (Open link / Open email / Call number),
 * not a full QR-payload parser (e.g. WIFI:/vCard formats fall through to
 * "text" for now). */
export function classifyQrContent(data: string): QrContentType {
  const trimmed = data.trim();
  if (/^https?:\/\//i.test(trimmed)) return 'link';
  if (/^mailto:/i.test(trimmed)) return 'email';
  if (/^tel:/i.test(trimmed)) return 'phone';
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
    case 'text':
      return null;
  }
}
