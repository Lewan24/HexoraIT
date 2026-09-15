import i18next from 'i18next'
import { initReactI18next, useTranslation } from 'react-i18next'
import en from './en.json'
import pl from './pl.json'

export const LANGUAGE_STORAGE_KEY = 'hexorait.language'
export const supportedLanguages = ['pl', 'en'] as const
export type Language = typeof supportedLanguages[number]

export function readLanguage(): Language {
  try { return localStorage.getItem(LANGUAGE_STORAGE_KEY) === 'en' ? 'en' : 'pl' }
  catch { return 'pl' }
}

void i18next.use(initReactI18next).init({
  resources: { pl: { translation: pl }, en: { translation: en } },
  lng: readLanguage(),
  fallbackLng: 'pl',
  supportedLngs: [...supportedLanguages],
  keySeparator: false,
  nsSeparator: false,
  interpolation: { escapeValue: false },
  initAsync: false,
})

function syncLanguage(language: string) {
  if (typeof document !== 'undefined') document.documentElement.lang = language
  try { localStorage.setItem(LANGUAGE_STORAGE_KEY, language) } catch { /* Storage may be disabled. */ }
}
syncLanguage(i18next.language)
i18next.on('languageChanged', syncLanguage)

/** Translate presentation text only. Never use for payloads, IDs or user content. */
export function tr(key: string, values?: Record<string, unknown>): string {
  return i18next.t(key, { ...values, defaultValue: key })
}

/** Subscribe components to language changes, preserving mounted form state. */
export function useLocale() {
  return useTranslation()
}

export function locale() { return i18next.language === 'en' ? 'en-US' : 'pl-PL' }
export default i18next
