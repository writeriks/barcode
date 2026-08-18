import type { QrContentType } from '../utils/classifyQrContent';

export interface MyCode {
  id: string;
  label: string;
  content: string;
  createdAt: number;
  /** Which generator form produced this code — absent for codes saved
   * before the typed forms existed, which just used a freeform textarea. */
  type?: QrContentType;

  /* How the code is drawn. All three are optional and absent means "the
   * plain black code" — which is what every code saved before this
   * existed still gets, without a migration. */

  /** Hex, always dark enough to scan; only utils/qrColor.ts produces one. */
  color?: string;
  /** A short line printed under the code, on the same paper. */
  caption?: string;
  /** Whether to draw this type's brand mark over the middle. Only means
   *  anything for the types utils/brandLogos.ts has a mark for. */
  logo?: boolean;
}
