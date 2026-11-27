import { useContext, useId, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { AuthContext } from '../hooks/auth-context'
import { effectivePref, rememberedRole, setThemePref, storedThemePref } from '../lib/theme'
import type { ThemePref } from '../lib/theme'

const OPTIONS: readonly ThemePref[] = ['light', 'dark', 'system']

/**
 * «Тема: светлая / тёмная / как в системе» for page headers. A native select:
 * one 48 px control instead of three more buttons in a header that already
 * wraps at 360 px. The choice is per device (src/lib/theme.ts). Also works on
 * pages without <AuthProvider> (role is then the remembered one).
 */
export function ThemeSwitcher({ className = '' }: { className?: string }) {
  const { t } = useTranslation()
  const role = useContext(AuthContext)?.profile?.role ?? rememberedRole()
  const [value, setValue] = useState<ThemePref>(() => effectivePref(storedThemePref(), role))
  const id = useId()
  return (
    <span className={`inline-flex shrink-0 items-center ${className}`}>
      <label htmlFor={id} className="sr-only">{t('theme.label')}</label>
      <select
        id={id}
        value={value}
        onChange={(e) => {
          const next = e.target.value as ThemePref
          setValue(next)
          setThemePref(next, role)
        }}
        className="min-h-12 rounded-control border-2 border-line bg-page px-3 text-body font-medium text-fg focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-focus"
      >
        {OPTIONS.map((o) => <option key={o} value={o}>{t(`theme.${o}`)}</option>)}
      </select>
    </span>
  )
}
