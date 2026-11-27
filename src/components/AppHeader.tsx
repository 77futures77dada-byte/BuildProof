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
  return (
    <header className="sticky top-0 z-[var(--z-header)] border-b-2 border-line bg-page">
      <div className="mx-auto flex max-w-[1120px] flex-wrap items-center justify-between gap-2 px-4 py-1">
        <div className="flex min-w-0 items-center gap-4">
          <Link
            to={logoTo}
            className="inline-flex min-h-12 items-center rounded-control text-h3 font-semibold text-fg no-underline focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-focus"
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
        <div className="flex flex-wrap items-center gap-2">
          {profile?.role === 'gc' ? (
            // NavLink marks «Тариф» with aria-current="page" on /tariff itself.
            <NavLink to="/tariff" className={buttonClass({ variant: 'ghost', size: 'md' }, 'px-3 aria-[current=page]:underline')}>
              {t('tariff.link')}
            </NavLink>
          ) : null}
          <ThemeSwitcher />
          <LanguageSwitcher />
          <Button variant="ghost" size="md" className="px-3" onClick={guard.request}>
            {t('common.signOut')}
          </Button>
        </div>
      </div>
      {children}
      {guard.dialog}
    </header>
  )
}
