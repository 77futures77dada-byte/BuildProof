import { useTranslation } from 'react-i18next'
import { useAuth } from '../hooks/useAuth'
import { LOCALES, changeLocale, currentLocale } from '../i18n'
import type { Locale } from '../i18n'
import { saveProfileLocale } from '../lib/locale'

/**
 * ET / RU / EN segmented control for page headers. The choice is remembered on
 * this device and, when signed in, saved to the user's profile.
 */
export function LanguageSwitcher({ className = '' }: { className?: string }) {
  const { t } = useTranslation()
  const { user } = useAuth()
  const active = currentLocale()

  function pick(locale: Locale) {
    if (locale === active) return
    void changeLocale(locale)
    if (user) void saveProfileLocale(user.id, locale)
  }

  return (
    <div
      role="group"
      aria-label={t('language.label')}
      className={`inline-flex shrink-0 rounded-lg border border-slate-200 bg-white p-0.5 ${className}`}
    >
      {LOCALES.map((locale) => (
        <button
          key={locale}
          type="button"
          lang={locale}
          onClick={() => pick(locale)}
          aria-pressed={locale === active}
          title={t(`language.${locale}`)}
          className={`min-h-8 min-w-9 rounded-md px-1.5 text-xs font-semibold uppercase transition-colors ${
            locale === active
              ? 'bg-sky-600 text-white'
              : 'text-slate-500 hover:bg-slate-100 hover:text-slate-800'
          }`}
        >
          {locale}
        </button>
      ))}
    </div>
  )
}
