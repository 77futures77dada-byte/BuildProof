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

const BTN =
  'inline-flex size-8 items-center justify-center rounded-lg border border-slate-200 text-slate-400 transition-colors hover:border-slate-300 hover:bg-slate-50'

/**
 * Quick actions on a stage row (overview screen): add a photo / create a task /
 * report a problem, all bound to this stage without a picker.
 *
 * On desktop the buttons are revealed on row hover/focus (the parent <li> is a
 * `group`); on touch they are always visible.
 */
export function StageActionButtons({
  stageName,
  capabilities,
  onAction,
}: StageActionButtonsProps) {
  return (
    <div className="flex shrink-0 gap-1 lg:invisible lg:group-hover:visible lg:group-focus-within:visible">
      {capabilities.photo ? (
        <button
          type="button"
          onClick={() => onAction('photo')}
          aria-label={`Добавить фото: ${stageName}`}
          className={`${BTN} hover:text-sky-600`}
        >
          <Camera className="size-4" aria-hidden="true" />
        </button>
      ) : null}
      {capabilities.task ? (
        <button
          type="button"
          onClick={() => onAction('task')}
          aria-label={`Создать задачу: ${stageName}`}
          className={`${BTN} hover:text-sky-600`}
        >
          <ClipboardList className="size-4" aria-hidden="true" />
        </button>
      ) : null}
      {capabilities.issue ? (
        <button
          type="button"
          onClick={() => onAction('issue')}
          aria-label={`Отметить проблему: ${stageName}`}
          className={`${BTN} hover:text-red-600`}
        >
          <TriangleAlert className="size-4" aria-hidden="true" />
        </button>
      ) : null}
    </div>
  )
}
