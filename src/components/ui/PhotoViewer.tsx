import { useState } from 'react'
import type { ReactNode } from 'react'
import { Button } from './Button'
import { Sheet } from './Sheet'
import { StatusIcon } from './StatusIcon'

interface PhotoViewerProps {
  open: boolean
  onClose: () => void
  /** Sheet title, e.g. `photos.viewer`. */
  title: ReactNode
  /** Signed URL; null = image failed. */
  src: string | null
  alt: string
  /** Caption under the photo (17/600): «отправлено {дата}» · имя · этап, StatusChip … */
  caption?: ReactNode
  /** Text for the failed image (`photos.imageFailed`). */
  failedLabel: ReactNode
  /** Gallery mode: both handlers + labels; omit for `single`. */
  onPrev?: () => void
  onNext?: () => void
  prevLabel?: ReactNode
  nextLabel?: ReactNode
}

/**
 * Photo viewer (03 §7 `photo-viewer` gallery / `issue-photo-zoom` single):
 * the photo on `--scrim`, caption below, «Закрыть» ≥ 48 px, paging ≥ 48 px.
 * Built on Sheet (theme root, focus trap, system Back closes).
 */
export function PhotoViewer({ open, onClose, title, src, alt, caption, failedLabel, onPrev, onNext, prevLabel, nextLabel }: PhotoViewerProps) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null)
  const failed = !src || failedSrc === src
  return (
    <Sheet open={open} onClose={onClose} title={title} history name="photo-viewer">
      <div className="flex flex-col gap-3">
        <div className="flex min-h-48 items-center justify-center overflow-hidden rounded-card bg-scrim">
          {failed ? (
            <p className="m-0 flex items-center gap-2 p-6 text-body font-medium text-on-scrim"><StatusIcon kind="error" />{failedLabel}</p>
          ) : (
            <img src={src} alt={alt} onError={() => setFailedSrc(src)} className="block max-h-[60vh] w-full object-contain" />
          )}
        </div>
        {caption ? <div className="text-body font-medium text-fg">{caption}</div> : null}
        {onPrev || onNext ? (
          <div className="flex justify-between gap-3">
            <Button variant="secondary" disabled={!onPrev} onClick={onPrev}>{prevLabel}</Button>
            <Button variant="secondary" disabled={!onNext} onClick={onNext}>{nextLabel}</Button>
          </div>
        ) : null}
      </div>
    </Sheet>
  )
}
