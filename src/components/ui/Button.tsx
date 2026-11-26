import { forwardRef } from 'react'
import type { ButtonHTMLAttributes } from 'react'
import { buttonClass } from './buttonClass'
import type { ButtonStyle } from './buttonClass'

export type { ButtonVariant, ButtonSize, ButtonStyle } from './buttonClass'

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement>, ButtonStyle {
  /** Shows a spinner, sets aria-busy and blocks clicks. Keep the label (say what is happening). */
  loading?: boolean
}

/**
 * Button. A disabled button has its reason in the label or right next to it
 * (03 §9). Touch target ≥ 48 px, primary 56 px.
 */
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'primary', size, block, loading = false, disabled, className, type = 'button', children, ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      // eslint-disable-next-line react/button-has-type
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      data-main={variant === 'primary' ? '' : undefined}
      className={buttonClass({ variant, size, block }, className)}
      {...rest}
    >
      {loading ? (
        <span aria-hidden="true" className="size-5 shrink-0 animate-spin rounded-full border-[3px] border-current border-t-transparent" />
      ) : null}
      {children}
    </button>
  )
})
