import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { getDeviceLanguageCode } from '../utils/locale';
import de from './locales/de.json';
import en from './locales/en.json';
import es from './locales/es.json';
import fr from './locales/fr.json';
import it from './locales/it.json';
import pl from './locales/pl.json';
import tr from './locales/tr.json';

export const SUPPORTED_LANGUAGES = ['en', 'tr', 'pl', 'es', 'fr', 'it', 'de'] as const;
export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number];

export function isSupportedLanguage(code: string): code is SupportedLanguage {
  return (SUPPORTED_LANGUAGES as readonly string[]).includes(code);
}

const resources = {
  en: { translation: en },
  tr: { translation: tr },
  pl: { translation: pl },
  es: { translation: es },
  fr: { translation: fr },
  it: { translation: it },
  de: { translation: de },
};

const deviceLanguage = getDeviceLanguageCode();
const initialLanguage = isSupportedLanguage(deviceLanguage) ? deviceLanguage : 'en';

i18n.use(initReactI18next).init({
  resources,
  lng: initialLanguage,
  fallbackLng: 'en',
  interpolation: { escapeValue: false },
});

export default i18n;
