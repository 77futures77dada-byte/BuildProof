import type { ReactNode } from 'react'
import { LOCALES, changeLocale } from '../../i18n'
import type { Locale } from '../../i18n'
import { isPlaceholder } from '../../config/legal'

/** House-with-check mark used in the header logo. */
export function LogoMark() {
  return (
    <i aria-hidden="true">
      <svg width="18" height="18" viewBox="0 0 18 18">
        <path d="M2 16V8l7-6 7 6v8" fill="none" stroke="#ffc72c" strokeWidth="2.2" strokeLinejoin="round" />
        <path d="M6.2 11l2.2 2.2 4-4.4" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </i>
  )
}

export function CheckIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="var(--ok)" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M4 10l4 4 8-9" />
    </svg>
  )
}

export function CrossIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="var(--bad)" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true">
      <path d="M5 5l10 10M15 5L5 15" />
    </svg>
  )
}

/** Shape that goes with a state colour, so the state never relies on colour alone. */
export type PillTone = 'ok' | 'warn' | 'bad' | 'neutral'

export function Pill({ tone, children }: { tone: PillTone; children: ReactNode }) {
  return (
    <span className={`pill ${tone === 'ok' ? '' : tone}`}>
      {tone === 'ok' && (
        <svg viewBox="0 0 10 10" aria-hidden="true">
          <circle cx="5" cy="5" r="5" />
        </svg>
      )}
      {tone === 'warn' && (
        <svg viewBox="0 0 10 10" aria-hidden="true">
          <path d="M5 0l5 10H0z" />
        </svg>
      )}
      {tone === 'bad' && (
        <svg viewBox="0 0 10 10" aria-hidden="true">
          <rect width="10" height="10" rx="1" />
        </svg>
      )}
      {children}
    </span>
  )
}

/** A value from config/legal.ts; unfilled [placeholders] are highlighted. */
export function Legal({ value }: { value: string }) {
  return isPlaceholder(value) ? <mark>{value}</mark> : <>{value}</>
}

export function LandingLanguageSwitcher({ locale, label }: { locale: Locale; label: string }) {
  return (
    <div className="lang" role="group" aria-label={label}>
      {LOCALES.map((l) => (
        <button key={l} type="button" lang={l} aria-pressed={l === locale} onClick={() => void changeLocale(l)}>
          {l.toUpperCase()}
        </button>
      ))}
    </div>
  )
}
