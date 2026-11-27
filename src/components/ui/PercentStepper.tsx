import type { ReactNode } from 'react'
import { Button } from './Button'
import { cx } from './cx'

export interface PercentStepperLabels {
  plus10: ReactNode
  plus25: ReactNode
  done100: ReactNode
  minus10: ReactNode
  /** «Назад к росту» — leaves the decrease mode (brief §2.5). */
  backToGrowth: ReactNode
}

interface PercentStepperProps {
  /** Current stage % («было», N). */
  base: number
  /** New % («станет», M). Default = base (no change, nothing pressed). */
  value: number
  onChange: (next: number) => void
  labels: PercentStepperLabels
  /** Decrease block content (reason chips), shown only while value < base. */
  decreaseSlot?: ReactNode
  disabled?: boolean
  className?: string
}

const clamp = (v: number) => Math.max(0, Math.min(100, v))

/**
 * «−10 / +10 / +25 / 100%» (brief §2.1б п.7 «Готово 100%»; the label is «100%»
 * by 04-copy L1 / CT C8 ред. 2 — a third of 328 px does not fit «Готово 100%»).
 * Growth: row «+10 · +25 · 100%» (≥ 56 px, gap 12), below at 24 px a secondary «−10».
 * Decrease (brief §2.5, wins over 03 §6.2): «−10» turns the sheet into the
 * decrease mode — the growth row is replaced by a selected «−10» chip (tap again
 * = another −10), the reason block, and «Назад к росту» (48 px).
 */
export function PercentStepper({ base, value, onChange, labels, decreaseSlot, disabled, className }: PercentStepperProps) {
  const decreasing = value < base
  const step = (d: number) => onChange(clamp(value + d))
  const big = 'min-h-14 min-w-0 flex-1 px-2'

  if (decreasing) {
    return (
      <div data-stepper="decrease" className={cx('flex flex-col gap-3', className)}>
        <button
          type="button"
          aria-pressed="true"
          disabled={disabled || value <= 0}
          onClick={() => step(-10)}
          className="inline-flex min-h-12 items-center self-start rounded-chip border-2 border-fg bg-fg px-5 text-field font-semibold text-page focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-focus disabled:cursor-not-allowed disabled:opacity-60"
        >
          {labels.minus10}
        </button>
        {decreaseSlot}
        <Button variant="ghost" disabled={disabled} onClick={() => onChange(base)} className="self-start px-3">
          {labels.backToGrowth}
        </Button>
      </div>
    )
  }

  return (
    <div data-stepper="growth" className={cx('flex flex-col gap-6', className)}>
      <div className="flex gap-3">
        <Button variant="secondary" size="main" disabled={disabled || value >= 100} onClick={() => step(10)} className={big}>{labels.plus10}</Button>
        <Button variant="secondary" size="main" disabled={disabled || value >= 100} onClick={() => step(25)} className={big}>{labels.plus25}</Button>
        <Button variant="secondary" size="main" disabled={disabled || value >= 100} onClick={() => onChange(100)} className={big}>{labels.done100}</Button>
      </div>
      <Button variant="secondary" disabled={disabled || value <= 0} onClick={() => step(-10)} className="self-start" data-minus>
        {labels.minus10}
      </Button>
    </div>
  )
}
