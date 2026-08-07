import type { QrContentType } from '../utils/classifyQrContent';

export interface MyCode {
  id: string;
  label: string;
  content: string;
  createdAt: number;
  /** Which generator form produced this code — absent for codes saved
   * before the typed forms existed, which just used a freeform textarea. */
  type?: QrContentType;
}
