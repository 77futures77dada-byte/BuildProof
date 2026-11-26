import { useId } from 'react'
import type { InputHTMLAttributes, ReactNode } from 'react'
import { StatusIcon } from './StatusIcon'
import { cx } from './cx'
import { controlClass } from './controlClass'

/** Props a control gets from FormField: wire them onto the input/select/textarea. */
export interface FieldControlProps {
  id: string
  'aria-describedby'?: string
  'aria-invalid'?: true
}

interface FormFieldProps {
  label: ReactNode
  /** Shown under the label, before the control («Например: …»); no placeholders (02-type §6.1). */
  hint?: ReactNode
  /** Shown under the control with the `error` icon; the word stays `--fg`. */
  error?: ReactNode
  className?: string
  children: (control: FieldControlProps) => ReactNode
}

/** Label + hint + control + error, wired for screen readers. */
export function FormField({ label, hint, error, className, children }: FormFieldProps) {
  const id = useId()
  const hintId = hint ? `${id}-hint` : undefined
  const errorId = error ? `${id}-error` : undefined
  const describedBy = [hintId, errorId].filter(Boolean).join(' ') || undefined
  return (
    <div className={cx('flex flex-col gap-1.5', className)}>
      <label htmlFor={id} className="text-field font-medium text-fg">{label}</label>
      {hint ? <p id={hintId} className="m-0 text-body font-medium text-fg">{hint}</p> : null}
      {children({ id, 'aria-describedby': describedBy, 'aria-invalid': error ? true : undefined })}
      {error ? (
        <p id={errorId} role="alert" className="m-0 flex items-start gap-2 text-body leading-[1.3] font-semibold text-fg">
          <StatusIcon kind="error" className="mt-px" />
          <span>{error}</span>
        </p>
      ) : null}
    </div>
  )
}

interface TextFieldProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'id'> {
  label: ReactNode
  hint?: ReactNode
  error?: ReactNode
}

/** Text input in a FormField. `className` goes on the wrapper. */
export function TextField({ label, hint, error, className, ...rest }: TextFieldProps) {
  return (
    <FormField label={label} hint={hint} error={error} className={className}>
      {(control) => <input {...control} {...rest} className={controlClass} />}
    </FormField>
  )
}
