import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button, Sheet } from './ui'

export type StageActionKind = 'mark' | 'photo' | 'task' | 'issue'

export interface StageActionCapabilities {
  mark?: boolean
  photo: boolean
  task: boolean
  issue: boolean
}

interface StageActionButtonsProps {
  stageName: string
  capabilities: StageActionCapabilities
  onAction: (kind: StageActionKind) => void
}

const LABEL: Record<StageActionKind, string> = {
  mark: 'overview.markStage',
  photo: 'overview.addPhoto',
  task: 'overview.createTask',
  issue: 'overview.reportIssue',
}

/**
 * «⋯» on a stage row (03 §5.1 block 4): one 48 px button opening a sheet with
 * «Отметить / Фото / Задача / Проблема» for this stage, words not pictograms.
 */
export function StageActionButtons({ stageName, capabilities, onAction }: StageActionButtonsProps) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const kinds = (['mark', 'photo', 'task', 'issue'] as const).filter((k) => capabilities[k])
  if (!kinds.length) return null
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={`${t('common.actions')}: ${stageName}`}
        aria-haspopup="dialog"
        className="inline-flex size-12 shrink-0 items-center justify-center rounded-control border-2 border-fg bg-page text-h3 font-medium text-fg hover:bg-surface focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-focus"
      >
        <span aria-hidden="true">…</span>
      </button>
      <Sheet open={open} onClose={() => setOpen(false)} title={stageName}>
        <div className="flex flex-col gap-3">
          {kinds.map((kind) => (
            <Button
              key={kind}
              variant="secondary"
              block
              onClick={() => {
                setOpen(false)
                onAction(kind)
              }}
            >
              {t(LABEL[kind])}
            </Button>
          ))}
        </div>
      </Sheet>
    </>
  )
}
