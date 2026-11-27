import type { ReactNode } from 'react'
import { Link, NavLink } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../hooks/useAuth'
import { LanguageSwitcher } from './LanguageSwitcher'
import { ThemeSwitcher } from './ThemeSwitcher'
import { Button, buttonClass } from './ui'
import { useSignOutGuard } from './report/SignOutDraftsConfirm'

/**
 * Top bar (03 §2.1 `shell-app`, §2.2 `shell-project`): logo = «К объектам»
 * (≥ 48 px), «Тариф» only for gc, language, «Выйти». Name and role from 1024 px.
 */
export function AppHeader({ logoTo = '/dashboard', children }: { logoTo?: string; children?: ReactNode }) {
  const { profile, user, signOut } = useAuth()
  const { t } = useTranslation()
  const guard = useSignOutGuard(user?.id, signOut)
  // sticky only from 1024 px: on a phone the header (logo, switches, project
  // title, tabs) is ~250 px and would cover half of a 553 px screen
  return (
    <header className="top-0 z-[var(--z-header)] border-b border-line bg-page lg:sticky">
      <div className="mx-auto flex max-w-[1120px] flex-wrap items-center gap-x-2 gap-y-1 px-4 py-1">
        <div className="flex min-w-0 items-center gap-4">
          <Link
            to={logoTo}
            className="inline-flex min-h-12 items-center rounded-control text-h3 pointer-fine:min-h-10 font-medium text-fg no-underline focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-focus"
          >
            BuildProof
            <span className="sr-only"> · {t('tariff.toProjects')}</span>
          </Link>
          {profile ? (
            <span className="hidden text-body text-muted-strong lg:inline">
              {profile.full_name ?? user?.email} · {t(`roles.${profile.role}`)}
            </span>
          ) : null}
        </div>
        {/* phone: row 1 = logo · Тариф · Выйти, row 2 = theme + language; desktop: one row.
            No CSS order: DOM order = visual order = Tab order at every width. */}
        <div className="ml-auto flex items-center gap-2">
          {profile?.role === 'gc' ? (
            // NavLink marks «Тариф» with aria-current="page" on /tariff itself.
            <NavLink to="/tariff" className={buttonClass({ variant: 'ghost', size: 'md' }, 'px-3 aria-[current=page]:underline')}>
              {t('tariff.link')}
            </NavLink>
          ) : null}
          <Button variant="ghost" size="md" className="px-3" onClick={guard.request}>
            {t('common.signOut')}
          </Button>
        </div>
        <div className="flex w-full flex-wrap items-center gap-2 lg:w-auto">
          <ThemeSwitcher />
          <LanguageSwitcher />
        </div>
      </div>
      {children}
      {guard.dialog}
    </header>
  )
}
