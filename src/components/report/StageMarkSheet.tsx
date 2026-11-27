import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { stageLabel } from '../../i18n/stageLabel'
import { Button, NetBar, PercentStepper, Sheet, useOnline } from '../ui'

export interface MarkableStage {
  id: string
  name: string
  progressPercent: number
}

interface StageMarkSheetProps {
  /** Stage to mark; null = closed. */
  stage: MarkableStage | null
  onClose: () => void
  /**
   * Persist the new percent (owner/foreman: `update_stage_progress`, no photo,
   * 03 §5.3 / brief §2.3 В1). Rejects on failure — the sheet stays open with
   * the error. `useProjectStages().commitPercent` fits as is.
   */
  onSave: (stageId: string, percent: number) => Promise<void>
  /** Called after a successful save (the sheet then closes). */
  onSaved?: (stageId: string, percent: number) => void
}

/**
 * Owner / foreman mark sheet: «было N%, станет M%», the shared
 * `PercentStepper`, one main «Сохранить». No camera (photos go through the
 * report sheet). DOM hook: `[data-sheet="stage-mark"]`.
 */
export function StageMarkSheet({ stage, onClose, onSave, onSaved }: StageMarkSheetProps) {
  const [openFor, setOpenFor] = useState<string | null>(null)
  const [value, setValue] = useState(0)
  const [saving, setSaving] = useState(false)
  const [failed, setFailed] = useState(false)
  const online = useOnline()
  const { t } = useTranslation()

  const key = stage ? stage.id : null
  if (key !== openFor) {
    setOpenFor(key)
    setValue(stage ? Math.round(stage.progressPercent) : 0)
    setFailed(false)
    setSaving(false)
  }

  if (!stage) return null
  const base = Math.round(stage.progressPercent)
  const name = stageLabel(stage.name)
  const unchanged = value === base

  async function save() {
    if (!stage || unchanged) return
    setSaving(true)
    setFailed(false)
    try {
      await onSave(stage.id, value)
      setSaving(false)
      onSaved?.(stage.id, value)
      onClose()
    } catch {
      setSaving(false)
      setFailed(true)
    }
  }

  return (
    <Sheet
      open
      onClose={onClose}
      title={t('overview.markStage')}
      history
      name="stage-mark"
      busy={saving ? 'busy-locked' : undefined}
      footer={
        <Button variant="primary" block loading={saving} disabled={unchanged || !online} onClick={() => void save()}>
          {t('common.save')}
        </Button>
      }
    >
      <div className="flex flex-col gap-4">
        <NetBar />
        <p className="m-0 text-h3 font-bold text-fg [overflow-wrap:anywhere]">{name}</p>
        <p className="m-0 text-field font-semibold text-fg num-col">{t('report.wasWill', { from: base, to: value })}</p>
        <PercentStepper
          base={base}
          value={value}
          onChange={(next) => { setValue(next); setFailed(false) }}
          disabled={saving}
          labels={{
            plus10: t('report.plus10'), plus25: t('report.plus25'), done100: t('report.done100'),
            minus10: t('report.minus10'), backToGrowth: t('report.backToGrowth'),
          }}
        />
        {!unchanged ? (
          <Button variant="ghost" disabled={saving} onClick={() => setValue(base)} className="self-start px-3">
            {t('report.noChange')}
          </Button>
        ) : null}
        {failed ? <p role="alert" className="m-0 text-body font-semibold text-fg">{t('common.unexpectedError')}</p> : null}
      </div>
    </Sheet>
  )
}
