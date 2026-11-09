import { useTranslation } from 'react-i18next'
import { currentLocale } from '../../../i18n'
import type { Locale } from '../../../i18n'
import { en } from './en'
import { et } from './et'
import { ru } from './ru'
import type { LandingCopy } from './ru'

export type { CopyItem, FaqItem, LandingCopy } from './ru'

const COPY: Record<Locale, LandingCopy> = { ru, en, et }

/**
 * Landing copy in the current UI language. The language is the app's i18n
 * state (browser detection, stored choice, LanguageSwitcher); subscribing via
 * useTranslation re-renders the page when it changes.
 */
export function useLandingCopy(): { copy: LandingCopy; locale: Locale } {
  useTranslation()
  const locale = currentLocale()
  return { copy: COPY[locale], locale }
}
