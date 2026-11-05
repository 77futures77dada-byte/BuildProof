import { useContext } from 'react'
import { useTranslation } from 'react-i18next'
import { AuthContext } from '../hooks/auth-context'
import { LOCALES, changeLocale, currentLocale } from '../i18n'
import type { Locale } from '../i18n'

/**
 * ET / RU / EN segmented control for page headers. The choice is remembered on
 * this device and, when signed in, saved to the user's profile.
 *
 * Also rendered on the public landing, which has no <AuthProvider>: auth is
 * read optionally and the Supabase-backed save is loaded only when needed, so
 * the landing chunk stays free of the Supabase client.
 */
export function LanguageSwitcher({ className = '' }: { className?: string }) {
  const { t } = useTranslation()
  const user = useContext(AuthContext)?.user ?? null
  const active = currentLocale()

  function pick(locale: Locale) {
    if (locale === active) return
    void changeLocale(locale)
    if (user) void import('../lib/locale').then((m) => m.saveProfileLocale(user.id, locale))
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
