import { cx } from './cx'

export interface FilterChip {
  id: string
  label: string
}

interface FilterChipsProps {
  chips: FilterChip[]
  selected: string
  onSelect: (id: string) => void
  /** Accessible name of the group («Этап»). */
  label: string
  className?: string
}

/** One-choice filter chips (03 §9): ≥ 48 px, the strip scrolls inside itself (03 Ж6). */
export function FilterChips({ chips, selected, onSelect, label, className }: FilterChipsProps) {
  return (
    <div role="group" aria-label={label} className={cx('-mx-4 flex gap-2 overflow-x-auto px-4 pb-1', className)}>
      {chips.map((c) => {
        const on = c.id === selected
        return (
          <button
            key={c.id}
            type="button"
            aria-pressed={on}
            onClick={() => onSelect(c.id)}
            className={cx(
              'inline-flex min-h-12 shrink-0 items-center rounded-chip border-2 px-4 text-body font-medium whitespace-nowrap',
              'focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-focus',
              on ? 'border-fg bg-fg text-page' : 'border-line bg-page text-fg hover:border-fg',
            )}
          >
            {c.label}
          </button>
        )
      })}
    </div>
  )
}
