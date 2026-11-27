import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import type { DashboardProject } from '../hooks/useProjects'
import { formatDate } from '../lib/format'
import { ProgressBar } from './ui'

/**
 * Worker's site tile (03 §4.4): name, figure, bar, «Ваш последний отчёт: {дата}»
 * and a chevron; ≥ 80 px, one tap to the site's «Сегодня».
 */
export function WorkerProjectCard({ project }: { project: DashboardProject }) {
  const { t } = useTranslation()
  return (
    <Link
      data-zone="field"
      to={`/project/${project.id}/today`}
      className="flex min-h-20 items-center gap-4 rounded-card border border-line bg-surface p-4 text-fg no-underline shadow-card hover:border-fg focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-focus active:border-fg"
    >
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <span className="flex items-baseline justify-between gap-3">
          <span className="min-w-0 text-h3 font-medium [overflow-wrap:anywhere]">{project.name}</span>
          <span className="shrink-0 text-h2 font-medium">{project.overallPercent}%</span>
        </span>
        {project.address ? <span className="text-body [overflow-wrap:anywhere]">{project.address}</span> : null}
        <ProgressBar value={project.overallPercent} />
        <span className="text-body font-medium">
          {project.myLastReportAt
            ? t('dashboard.workerLastReport', { date: formatDate(project.myLastReportAt) })
            : t('dashboard.workerNoReport')}
        </span>
      </div>
      <svg aria-hidden="true" viewBox="0 0 20 20" width="24" height="24" className="shrink-0">
        <path d="M7 4l6 6-6 6" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </Link>
  )
}
