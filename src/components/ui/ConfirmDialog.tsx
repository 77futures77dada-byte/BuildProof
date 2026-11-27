import type { ReactNode } from 'react'
import { Button } from './Button'
import { Sheet } from './Sheet'

interface ConfirmDialogProps {
  open: boolean
  title: ReactNode
  /** What happens, in plain words. */
  body: ReactNode
  /** The main (yellow) action. For risky choices it is the safe one («Остаться»). */
  primaryLabel: ReactNode
  onPrimary: () => void
  secondaryLabel: ReactNode
  onSecondary: () => void
  /** Secondary is destructive (red edge, word in --fg). */
  destructive?: boolean
  /** Saving: both buttons blocked, primary shows a spinner. */
  busy?: boolean
  /** Error line under the body (17/600). */
  error?: ReactNode
  /** Close (Esc, backdrop, «Закрыть», system back). Defaults to onPrimary. */
  onClose?: () => void
  name?: string
}

/** Confirm dialog on `Sheet` (theme root, focus trap, history): idle / saving / error (03 §9). */
export function ConfirmDialog({
  open, title, body, primaryLabel, onPrimary, secondaryLabel, onSecondary, destructive, busy, error, onClose, name,
}: ConfirmDialogProps) {
  return (
    <Sheet
      open={open}
      onClose={onClose ?? onPrimary}
      title={title}
      history
      name={name}
      busy={busy ? 'busy-locked' : undefined}
      footer={
        <div className="flex flex-col gap-3">
          <Button variant="primary" block loading={busy} onClick={onPrimary}>{primaryLabel}</Button>
          <Button variant={destructive ? 'danger' : 'secondary'} block disabled={busy} onClick={onSecondary}>{secondaryLabel}</Button>
        </div>
      }
    >
      <p className="m-0 text-field font-medium text-fg">{body}</p>
      {error ? <p role="alert" className="m-0 mt-3 text-body font-semibold text-fg">{error}</p> : null}
    </Sheet>
  )
}
