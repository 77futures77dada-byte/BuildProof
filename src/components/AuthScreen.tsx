import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { LanguageSwitcher } from './LanguageSwitcher'
import { ThemeSwitcher } from './ThemeSwitcher'

/**
 * Frame of the sign-in and system screens (03 §3): logo row with the language
 * switch, one column on the phone, a 420 px card centred on the desktop.
 */
export function AuthScreen({ children, footer }: { children: ReactNode; footer?: ReactNode }) {
  const { t } = useTranslation()
  return (
    <div className="flex min-h-svh flex-col bg-page text-fg">
      <header className="flex flex-wrap items-center justify-between gap-3 px-4 py-2">
        <Link
          to="/"
          aria-label={t('auth.backHome')}
          className="inline-flex min-h-12 items-center rounded-control px-1 text-h3 text-fg no-underline focus-visible:outline-3 focus-visible:outline-focus"
        >
          BuildProof
        </Link>
        <div className="flex flex-wrap items-center gap-2">
          <ThemeSwitcher />
          <LanguageSwitcher />
        </div>
      </header>
      <main className="flex flex-1 flex-col items-center px-4 pt-4 pb-8 lg:justify-center">
        <div className="flex w-full max-w-[420px] flex-col gap-5 lg:rounded-card lg:border-2 lg:border-line lg:p-8 lg:shadow-card">
          {children}
        </div>
        {footer ? <div className="mt-6 flex w-full max-w-[420px] flex-col gap-3">{footer}</div> : null}
      </main>
    </div>
  )
}
