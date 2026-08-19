import { Linking } from 'react-native';

export interface Coordinates {
  latitude: string;
  longitude: string;
}

/**
 * Every shape a location code might hold, in the order worth trying.
 *
 * The Google Maps link this app writes, Google's two other spellings (the
 * `q=` one older generators emit and the `@lat,lng,zoom` one a browser's
 * address bar produces), the Apple Maps link this app wrote briefly, and
 * the `geo:` URI Android generators still write. A short link — goo.gl,
 * maps.app.goo.gl — hides its coordinates behind a redirect and matches
 * none of these.
 */
const COORDINATE_PATTERNS = [
  /^geo:(-?[\d.]+),(-?[\d.]+)/i,
  /^https?:\/\/[^/]*google\.[a-z.]{2,}\/maps\S*[?&]query=(-?[\d.]+),(-?[\d.]+)/i,
  /^https?:\/\/[^/]*google\.[a-z.]{2,}\/[^?]*\?(?:[^#]*&)?q=(-?[\d.]+),(-?[\d.]+)/i,
  /^https?:\/\/[^/]*google\.[a-z.]{2,}\/maps\/[^?]*@(-?[\d.]+),(-?[\d.]+)/i,
  /^https?:\/\/maps\.apple\.com\/\?(?:[^#]*&)?ll=(-?[\d.]+),(-?[\d.]+)/i,
];

/** The pair of numbers inside a location code, whatever it's wrapped in. */
export function extractCoordinates(content: string): Coordinates | null {
  for (const pattern of COORDINATE_PATTERNS) {
    const match = content.trim().match(pattern);
    if (match) return { latitude: match[1], longitude: match[2] };
  }
  return null;
}

/** `q` as well as `ll` because `ll` alone centres the map without marking
 *  anything, and a location with no pin on it is a map, not a place. */
export function appleMapsUri({ latitude, longitude }: Coordinates): string {
  return `https://maps.apple.com/?ll=${latitude},${longitude}&q=${latitude},${longitude}`;
}

/**
 * Google Maps' own scheme — the app, directly, with no web page in the
 * middle. Only worth handing to Linking once canOpenURL has said the app
 * is there; see preferredMapUri.
 */
function googleMapsAppUri({ latitude, longitude }: Coordinates): string {
  return `comgooglemaps://?q=${latitude},${longitude}&center=${latitude},${longitude}&zoom=15`;
}

/**
 * Where a location code should actually open: Google Maps if this phone
 * has it, Apple Maps if it doesn't.
 *
 * The https link inside the code can't decide this on its own. A Google
 * Maps link is a universal link — it reaches the app when the app is
 * installed, and lands in Safari when it isn't, which is a worse place to
 * end up than the map app the phone does have. Asking first turns that
 * miss into Apple Maps.
 *
 * `canOpenURL` only answers honestly about a custom scheme the app has
 * declared in LSApplicationQueriesSchemes; `comgooglemaps` is declared in
 * app.config.ts, and removing it there would silently make this function
 * always answer Apple.
 *
 * A code whose coordinates can't be read — a short link — has nothing to
 * rewrite, so it opens as written.
 */
export async function preferredMapUri(content: string, fallback: string): Promise<string> {
  const coordinates = extractCoordinates(content);
  if (!coordinates) return fallback;
  try {
    if (await Linking.canOpenURL('comgooglemaps://')) return googleMapsAppUri(coordinates);
  } catch {
    // A refused query is an answer too: treat it as "not installed".
  }
  return appleMapsUri(coordinates);
}
