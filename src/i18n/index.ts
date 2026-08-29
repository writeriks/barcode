import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { getDeviceLocale } from '../utils/locale';
import de from './locales/de.json';
import en from './locales/en.json';
import es from './locales/es.json';
import fr from './locales/fr.json';
import it from './locales/it.json';
import ja from './locales/ja.json';
import pl from './locales/pl.json';
import tr from './locales/tr.json';
import zhHans from './locales/zh-Hans.json';
import zhHant from './locales/zh-Hant.json';
import { SUPPORTED_LANGUAGES, isSupportedLanguage, type SupportedLanguage } from './languages';
import { resolveSupportedLanguage } from './resolveLanguage';

export { SUPPORTED_LANGUAGES, isSupportedLanguage, type SupportedLanguage };
export { resolveSupportedLanguage };

function resolveDeviceLanguage(): SupportedLanguage {
  const locale = getDeviceLocale();
  return (
    resolveSupportedLanguage(locale.languageCode, {
      languageTag: locale.languageTag,
      languageScriptCode: locale.languageScriptCode,
      regionCode: locale.regionCode,
    }) ?? 'en'
  );
}

export { resolveDeviceLanguage };

const resources = {
  en: { translation: en },
  tr: { translation: tr },
  pl: { translation: pl },
  es: { translation: es },
  fr: { translation: fr },
  it: { translation: it },
  de: { translation: de },
  ja: { translation: ja },
  'zh-Hans': { translation: zhHans },
  'zh-Hant': { translation: zhHant },
};

i18n.use(initReactI18next).init({
  resources,
  lng: resolveDeviceLanguage(),
  fallbackLng: 'en',
  interpolation: { escapeValue: false },
});

export default i18n;
