import { PROJECT_STATUS_LABELS } from '../types'
import type { ProjectStatus } from '../types'

const STATUS_STYLE: Record<ProjectStatus, string> = {
  active: 'bg-sky-100 text-sky-700',
  paused: 'bg-slate-100 text-slate-600',
  completed: 'bg-green-100 text-green-700',
}

export function ProjectStatusBadge({ status }: { status: ProjectStatus }) {
  return (
    <span
      className={`inline-block shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLE[status]}`}
    >
      {PROJECT_STATUS_LABELS[status]}
    </span>
  )
}
