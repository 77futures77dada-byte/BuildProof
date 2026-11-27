import { useState } from 'react'
import type { InputHTMLAttributes, ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { FormField, controlClass, cx } from '../ui'
import { normalizeCode } from '../../lib/authCode'

interface BaseProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'id' | 'onChange' | 'value' | 'type'> {
  label: ReactNode
  hint?: ReactNode
  error?: ReactNode
  value: string
  onValue: (value: string) => void
}

/** Password with «Показать / Скрыть» (48 px) inside the field (03 §3.1 п.3). */
export function PasswordField({ label, hint, error, value, onValue, ...rest }: BaseProps) {
  const { t } = useTranslation()
  const [shown, setShown] = useState(false)
  return (
    <FormField label={label} hint={hint} error={error}>
      {(control) => (
        <div className="relative">
          <input
            {...control}
            {...rest}
            type={shown ? 'text' : 'password'}
            value={value}
            onChange={(e) => onValue(e.target.value)}
            className={cx(controlClass, 'pr-32')}
          />
          <button
            type="button"
            onClick={() => setShown((s) => !s)}
            aria-pressed={shown}
            aria-controls={control.id}
            className="absolute top-1 right-1 inline-flex min-h-12 items-center rounded-control px-3 text-body font-medium text-fg underline underline-offset-4 hover:bg-surface focus-visible:outline-3 focus-visible:outline-focus"
          >
            {shown ? t('auth.hidePassword') : t('auth.showPassword')}
          </button>
        </div>
      )}
    </FormField>
  )
}

/**
 * One field for a 6–10 digit e-mail code (residual Б4-М5): numeric keyboard,
 * `one-time-code` autofill, paste of «123 456» or a whole sentence keeps the
 * digits only. Value 20/600 without tabular figures.
 */
export function CodeField({ label, hint, error, value, onValue, ...rest }: BaseProps) {
  return (
    <FormField label={label} hint={hint} error={error}>
      {(control) => (
        <input
          {...control}
          {...rest}
          type="text"
          inputMode="numeric"
          autoComplete="one-time-code"
          pattern="[0-9]*"
          value={value}
          onChange={(e) => onValue(normalizeCode(e.target.value))}
          className={cx(controlClass.replace('text-field', 'text-btn'), 'tracking-[0.12em]')}
        />
      )}
    </FormField>
  )
}
