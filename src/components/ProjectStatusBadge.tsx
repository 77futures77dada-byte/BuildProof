import { useTranslation } from 'react-i18next'
import type { ProjectStatus } from '../types'
import { StatusChip } from './ui/StatusChip'

/** Paused = SVG `paused` + word; active/completed have no shape in 02-type §8, so word only. */
export function ProjectStatusBadge({ status }: { status: ProjectStatus }) {
  const { t } = useTranslation()
  if (status === 'paused') return <StatusChip kind="paused" className="shrink-0">{t(`projectStatus.${status}`)}</StatusChip>
  return (
    <span className="inline-flex min-h-8 shrink-0 items-center gap-2 rounded-chip border border-line px-3 text-body font-medium text-fg">
      {t(`projectStatus.${status}`)}
    </span>
  )
}
