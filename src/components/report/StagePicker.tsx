import { useTranslation } from 'react-i18next'
import type { EditableStage } from '../../hooks/useProjectStages'
import { cx } from '../ui'

interface StagePickerProps {
  stages: EditableStage[]
  currentId: string | null
  onPick: (stage: EditableStage) => void
}

/**
 * Stage list (03 §6.3): rows ≥ 56 px, name left, current % right, the current
 * stage marked with a word. One tap picks — no main button.
 */
export function StagePicker({ stages, currentId, onPick }: StagePickerProps) {
  const { t } = useTranslation()
  if (stages.length === 0) return <p className="m-0 text-field font-medium text-fg">{t('stages.emptyAsk')}</p>
  return (
    <ul className="m-0 flex list-none flex-col gap-2 p-0" data-stage-picker>
      {stages.map((s) => {
        const current = s.id === currentId
        return (
          <li key={s.id}>
            <button
              type="button"
              aria-current={current ? 'true' : undefined}
              onClick={() => onPick(s)}
              className={cx(
                'flex min-h-14 w-full items-center justify-between gap-3 rounded-control border-2 px-4 py-2 text-left text-field font-medium text-fg',
                'focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-focus hover:bg-surface',
                current ? 'border-fg bg-surface' : 'border-line bg-page',
              )}
            >
              <span className="flex min-w-0 flex-col">
                <span className="break-words">{s.name}</span>
                {current ? <span className="text-body font-medium">{t('stagePicker.current')}</span> : null}
              </span>
              <span className="num-col shrink-0 font-semibold">{s.progressPercent}%</span>
            </button>
          </li>
        )
      })}
    </ul>
  )
}
