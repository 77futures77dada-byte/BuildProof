import { useContext, useEffect, useId, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { AuthContext } from '../hooks/auth-context'
import { THEME_EVENT, effectivePref, rememberedRole, setThemePref, storedThemePref } from '../lib/theme'
import type { ThemePref } from '../lib/theme'

const OPTIONS: readonly ThemePref[] = ['light', 'dark', 'system']

/**
 * «Тема: светлая / тёмная / как в системе» for page headers. A native select:
 * one 48 px control instead of three more buttons in a header that already
 * wraps at 360 px. The closed control reads «Тема: тёмная», so it is not taken
 * for a second language picker. Border = --fg like every form control (3:1).
 * The choice is per device (src/lib/theme.ts); every switcher on the page
 * follows THEME_EVENT. Works without <AuthProvider> (landing): the role is then
 * the remembered one.
 */
export function ThemeSwitcher({ className = '' }: { className?: string }) {
  const { t } = useTranslation()
  const role = useContext(AuthContext)?.profile?.role ?? rememberedRole()
  // Derived on every render (stored choice, else role default), so a role that
  // arrives after mount is reflected; THEME_EVENT only re-renders when another
  // switcher or sign-in/out changed the theme.
  const [, rerender] = useState(0)
  const value = effectivePref(storedThemePref(), role)
  const id = useId()
  useEffect(() => {
    const onChange = () => rerender((n) => n + 1)
    window.addEventListener(THEME_EVENT, onChange)
    return () => window.removeEventListener(THEME_EVENT, onChange)
  }, [])

  return (
    <span className={`inline-flex shrink-0 items-center ${className}`}>
      <label htmlFor={id} className="sr-only">{t('theme.label')}</label>
      <select
        id={id}
        value={value}
        onChange={(e) => setThemePref(e.target.value as ThemePref, role)}
        className="min-h-12 rounded-control pointer-fine:min-h-10 border border-line-strong bg-page px-3 text-body font-medium text-fg focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-focus"
      >
        {OPTIONS.map((o) => <option key={o} value={o}>{t('theme.option', { value: t(`theme.${o}`) })}</option>)}
      </select>
    </span>
  )
}
