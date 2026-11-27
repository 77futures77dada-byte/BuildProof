import { cx } from './cx'

/** Shared control look: 56 px, 2 px `--fg` frame (`--stale-ink` when invalid), value 18/600. */
export const controlClass = cx(
  'min-h-14 w-full rounded-control border-2 border-fg bg-page px-4 text-field font-medium text-fg',
  'focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-focus',
  'aria-[invalid=true]:border-stale disabled:cursor-not-allowed disabled:opacity-60',
)
