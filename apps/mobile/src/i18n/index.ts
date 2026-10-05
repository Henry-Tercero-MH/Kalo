/**
 * Textos de la interfaz. Español (formal, «usted») es la base; para agregar un idioma maya
 * cree locales/<código>.json con las mismas claves y regístrelo aquí (ver locales/README.md).
 */
import { getLocales } from 'expo-localization';
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import es from './locales/es.json';

export const IDIOMAS = { es } as const;

void i18n.use(initReactI18next).init({
  resources: Object.fromEntries(Object.entries(IDIOMAS).map(([k, v]) => [k, { translation: v }])),
  lng:
    getLocales()[0]?.languageCode && getLocales()[0]!.languageCode! in IDIOMAS
      ? getLocales()[0]!.languageCode!
      : 'es',
  fallbackLng: 'es',
  interpolation: { escapeValue: false },
  returnNull: false,
});

export default i18n;
