import { getLocales } from 'expo-localization';
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import de from './locales/de.json';
import vi from './locales/vi.json';

export const SUPPORTED_LOCALES = ['de', 'vi'] as const;
export type AppLocale = (typeof SUPPORTED_LOCALES)[number];

export const resources = { de: { translation: de }, vi: { translation: vi } } as const;

export function isAppLocale(value: unknown): value is AppLocale {
  return typeof value === 'string' && (SUPPORTED_LOCALES as readonly string[]).includes(value);
}

/** Gerätesprache, falls unterstützt – sonst Deutsch. */
export function detectDeviceLocale(): AppLocale {
  const code = getLocales()[0]?.languageCode;
  return isAppLocale(code) ? code : 'de';
}

// eslint-disable-next-line import/no-named-as-default-member -- i18next-API
void i18n.use(initReactI18next).init({
  resources,
  lng: detectDeviceLocale(),
  fallbackLng: 'de',
  interpolation: { escapeValue: false },
  returnNull: false,
});

export default i18n;
