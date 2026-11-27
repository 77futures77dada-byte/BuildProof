import { cx } from './cx'

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger'
export type ButtonSize = 'main' | 'md'

export interface ButtonStyle {
  variant?: ButtonVariant
  /** `main` = 56 px / 20 px text (default for primary), `md` = 48 px / 18 px. */
  size?: ButtonSize
  /** Full width. */
  block?: boolean
}

const VARIANT: Record<ButtonVariant, string> = {
  // brand yellow; one per screen (03 Ж4), marked with data-main
  primary: 'border-accent-border bg-accent text-on-accent shadow-press hover:bg-accent-pressed',
  secondary: 'border-fg bg-page text-fg hover:bg-surface',
  ghost: 'border-transparent bg-transparent text-fg underline-offset-4 hover:bg-surface hover:underline',
  // destructive: red edge + word in --fg (coloured text fails under glare)
  danger: 'border-stale bg-page text-fg hover:bg-surface',
}
const SIZE: Record<ButtonSize, string> = {
  main: 'min-h-14 px-6 text-btn',
  md: 'min-h-12 px-5 text-field',
}

/** Class list for a button-looking element (use on <a>/<Link> for a link button). */
export function buttonClass({ variant = 'primary', size, block }: ButtonStyle = {}, extra?: string): string {
  return cx(
    'inline-flex items-center justify-center gap-2 rounded-control border-2 text-center font-semibold no-underline transition-colors',
    'focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-focus',
    'disabled:cursor-not-allowed disabled:opacity-60 aria-disabled:cursor-not-allowed aria-disabled:opacity-60',
    VARIANT[variant],
    SIZE[size ?? (variant === 'primary' ? 'main' : 'md')],
    block && 'w-full',
    extra,
  )
}
