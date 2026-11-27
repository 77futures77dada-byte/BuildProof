import { useEffect, useRef, useState } from 'react'
import {
  PROGRESS_MAX,
  PROGRESS_MIN,
  PROGRESS_STEP,
  snapProgress,
} from '../lib/stages'
import { useTranslation } from 'react-i18next'
import { toErrorMessage } from '../lib/format'
import { ErrorMessage } from './ErrorMessage'

const COMMIT_DELAY_MS = 500

interface StageProgressControlProps {
  /** Confirmed (or optimistic) percent from the parent. */
  value: number
  label: string
  /** Persists the new value; rejects on failure (parent handles rollback). */
  onCommit: (newPercent: number) => Promise<void>
}

/**
 * Slider + −/+ steppers for a stage's progress (0–100, step 5).
 *
 * Dragging updates the displayed value immediately but the RPC fires only once
 * the value settles: {@link COMMIT_DELAY_MS} after the last change, or right
 * away on pointer/key release.
 */
export function StageProgressControl({ value, label, onCommit }: StageProgressControlProps) {
  const { t } = useTranslation()
  // Non-null while an edit is in progress (before the commit settles).
  const [draft, setDraft] = useState<number | null>(null)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const pending = useRef<number | null>(null)

  const shown = draft ?? value

  useEffect(() => {
    return () => {
      if (timer.current) clearTimeout(timer.current)
    }
  }, [])

  function clearTimer() {
    if (timer.current) {
      clearTimeout(timer.current)
      timer.current = null
    }
  }

  async function commit(next: number) {
    clearTimer()
    pending.current = null
    if (next === value) {
      setDraft(null)
      return
    }
    setSaving(true)
    setSaveError(null)
    try {
      await onCommit(next)
    } catch (err) {
      setSaveError(toErrorMessage(err))
    } finally {
      setDraft(null)
      setSaving(false)
    }
  }

  function scheduleCommit(next: number) {
    pending.current = next
    clearTimer()
    timer.current = setTimeout(() => {
      if (pending.current !== null) void commit(pending.current)
    }, COMMIT_DELAY_MS)
  }

  function handleChange(raw: number) {
    const next = snapProgress(raw)
    setDraft(next)
    scheduleCommit(next)
  }

  function flush() {
    if (pending.current !== null) void commit(pending.current)
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => handleChange(shown - PROGRESS_STEP)}
          disabled={shown <= PROGRESS_MIN}
          aria-label={t('stages.decrease', { stage: label })}
          className="inline-flex size-12 shrink-0 items-center justify-center rounded-control border-2 border-fg bg-page text-h3 font-medium text-fg hover:bg-surface disabled:opacity-60 focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-focus"
        >
          <span aria-hidden="true">−</span>
        </button>

        <input
          type="range"
          min={PROGRESS_MIN}
          max={PROGRESS_MAX}
          step={PROGRESS_STEP}
          value={shown}
          onChange={(e) => handleChange(Number(e.target.value))}
          onPointerUp={flush}
          onKeyUp={flush}
          onBlur={flush}
          aria-label={t('stages.progress', { stage: label })}
          className="h-12 w-full cursor-pointer accent-[var(--fg)]"
        />

        <button
          type="button"
          onClick={() => handleChange(shown + PROGRESS_STEP)}
          disabled={shown >= PROGRESS_MAX}
          aria-label={t('stages.increase', { stage: label })}
          className="inline-flex size-12 shrink-0 items-center justify-center rounded-control border-2 border-fg bg-page text-h3 font-medium text-fg hover:bg-surface disabled:opacity-60 focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-focus"
        >
          <span aria-hidden="true">+</span>
        </button>

        <span aria-live="polite" className="num-col w-16 shrink-0 text-right text-h3 font-medium text-fg">
          {saving ? '…' : `${shown}%`}
        </span>
      </div>

      <ErrorMessage message={saveError} />
    </div>
  )
}
