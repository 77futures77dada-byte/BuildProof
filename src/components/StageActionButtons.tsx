import { Camera, ClipboardList, TriangleAlert } from 'lucide-react'

export type StageActionKind = 'photo' | 'task' | 'issue'

export interface StageActionCapabilities {
  photo: boolean
  task: boolean
  issue: boolean
}

interface StageActionButtonsProps {
  stageName: string
  capabilities: StageActionCapabilities
  onAction: (kind: StageActionKind) => void
}

const BTN_BASE =
  'inline-flex size-9 shrink-0 items-center justify-center rounded-lg transition-colors'
const BTN_NEUTRAL = `${BTN_BASE} border border-slate-200 bg-white text-slate-400 hover:border-slate-300 hover:bg-slate-50`
const BTN_ACCENT = `${BTN_BASE} bg-sky-600 text-white hover:bg-sky-700`

/**
 * Quick actions on a stage row (overview screen): add a photo / create a task /
 * report a problem, all bound to this stage without a picker.
 *
 * Photo is the primary, most frequent action, so it is accented; the rest stay
 * neutral. On desktop the buttons are revealed on row hover/focus (the parent
 * <li> is a `group`); on touch they are always visible.
 */
export function StageActionButtons({
  stageName,
  capabilities,
  onAction,
}: StageActionButtonsProps) {
  return (
    <div className="flex shrink-0 gap-1.5 lg:invisible lg:group-hover:visible lg:group-focus-within:visible">
      {capabilities.photo ? (
        <button
          type="button"
          onClick={() => onAction('photo')}
          aria-label={`Добавить фото: ${stageName}`}
          className={BTN_ACCENT}
        >
          <Camera className="size-[18px]" aria-hidden="true" />
        </button>
      ) : null}
      {capabilities.task ? (
        <button
          type="button"
          onClick={() => onAction('task')}
          aria-label={`Создать задачу: ${stageName}`}
          className={`${BTN_NEUTRAL} hover:text-sky-600`}
        >
          <ClipboardList className="size-[18px]" aria-hidden="true" />
        </button>
      ) : null}
      {capabilities.issue ? (
        <button
          type="button"
          onClick={() => onAction('issue')}
          aria-label={`Отметить проблему: ${stageName}`}
          className={`${BTN_NEUTRAL} hover:text-red-600`}
        >
          <TriangleAlert className="size-[18px]" aria-hidden="true" />
        </button>
      ) : null}
    </div>
  )
}
