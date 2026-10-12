import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import et from './locales/et.json'
import ru from './locales/ru.json'
import en from './locales/en.json'

export const LOCALES = ['et', 'ru', 'en'] as const
export type Locale = (typeof LOCALES)[number]

export const FALLBACK_LOCALE: Locale = 'ru'

/** localStorage key holding the user's explicit language choice. */
const STORAGE_KEY = 'buildproof.locale'

/** BCP-47 tags for Intl formatters (dates, numbers, relative time). */
const INTL_TAGS: Record<Locale, string> = {
  et: 'et-EE',
  ru: 'ru-RU',
  en: 'en-GB',
}

export function isLocale(value: unknown): value is Locale {
  return typeof value === 'string' && (LOCALES as readonly string[]).includes(value)
}

/** The language the user picked explicitly on this device, if any. */
export function getStoredLocale(): Locale | null {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    return isLocale(stored) ? stored : null
  } catch {
    return null
  }
}

function storeLocale(locale: Locale): void {
  try {
    localStorage.setItem(STORAGE_KEY, locale)
  } catch {
    // Private mode / blocked storage: the choice just won't survive a reload.
  }
}

/** First supported language from the browser's preference list. */
function detectBrowserLocale(): Locale | null {
  const prefs = typeof navigator !== 'undefined' ? navigator.languages ?? [navigator.language] : []
  for (const tag of prefs) {
    const base = tag?.toLowerCase().split('-')[0]
    if (isLocale(base)) return base
  }
  return null
}

function initialLocale(): Locale {
  return getStoredLocale() ?? detectBrowserLocale() ?? FALLBACK_LOCALE
}

export function currentLocale(): Locale {
  return isLocale(i18n.language) ? i18n.language : FALLBACK_LOCALE
}

export function intlTag(): string {
  return INTL_TAGS[currentLocale()]
}

function syncDocumentLang(locale: Locale) {
  document.documentElement.lang = locale
}

/**
 * Switch the UI language. `remember` stores it as an explicit choice on this
 * device; pass false when applying a value that came from the user's profile
 * so a later explicit pick still wins.
 */
export async function changeLocale(locale: Locale, remember = true): Promise<void> {
  if (remember) storeLocale(locale)
  syncDocumentLang(locale)
  if (i18n.language !== locale) await i18n.changeLanguage(locale)
}

void i18n.use(initReactI18next).init({
  resources: {
    et: { translation: et },
    ru: { translation: ru },
    en: { translation: en },
  },
  lng: initialLocale(),
  fallbackLng: FALLBACK_LOCALE,
  supportedLngs: [...LOCALES],
  interpolation: { escapeValue: false }, // React already escapes.
})

syncDocumentLang(currentLocale())

export default i18n
