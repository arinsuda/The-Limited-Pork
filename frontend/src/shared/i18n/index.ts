import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import th from './locales/th.json';
import en from './locales/en.json';

const savedLocale = localStorage.getItem('mookrob_locale') || 'th';

i18n
  .use(initReactI18next)
  .init({
    resources: {
      th: { translation: th },
      en: { translation: en },
    },
    lng: savedLocale,
    fallbackLng: 'th',
    interpolation: {
      escapeValue: false,
    },
  });

export function setLocale(locale: 'th' | 'en') {
  localStorage.setItem('mookrob_locale', locale);
  return i18n.changeLanguage(locale);
}

export default i18n;
