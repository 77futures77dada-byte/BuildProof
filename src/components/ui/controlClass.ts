import { cx } from './cx'

/** Shared control look: 56 px, 1 px `--line-strong` frame (muted but ≥ 3:1; `--stale-ink` when invalid), value 18/500. */
export const controlClass = cx(
  'min-h-14 w-full rounded-control border border-line-strong bg-page px-4 text-field font-medium text-fg',
  'focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-focus',
  'aria-[invalid=true]:border-stale disabled:cursor-not-allowed disabled:opacity-60',
)
