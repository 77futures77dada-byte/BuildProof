import { Link } from 'react-router-dom'
import { TriangleAlert } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import type { DashboardProject } from '../hooks/useProjects'
import { ProgressBar } from './ProgressBar'
import { ReportStatusBadge } from './ReportStatusBadge'

/**
 * Dashboard project row: overall %, report status (shape + text) and open
 * issues. The warning icon appears only when there are open issues.
 * Dense single row on desktop, stacked card on a phone.
 */
export function ProjectListCard({ project }: { project: DashboardProject }) {
  const { t } = useTranslation()
  const hasIssues = project.activeIssueCount > 0

  return (
    <Link
      to={`/project/${project.id}`}
      className="block rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-slate-300 hover:shadow-md"
    >
      <div className="md:flex md:items-center md:gap-5">
        <div className="min-w-0 md:flex-1">
          <div className="flex items-baseline justify-between gap-2 md:block">
            <span className="font-medium text-slate-900">{project.name}</span>
            <span className="text-2xl font-semibold tabular-nums text-slate-900 md:hidden">
              {project.overallPercent}%
            </span>
          </div>
          <p className="mt-0.5 truncate text-sm text-slate-500">
            {project.address ?? t('projectCard.noAddress')}
            {project.status !== 'active' ? ` · ${t(`projectStatus.${project.status}`)}` : ''}
          </p>
        </div>

        <div className="mt-3 md:mt-0 md:w-44 md:shrink-0">
          <div className="mb-1 hidden items-baseline justify-between md:flex">
            <span className="text-[11px] font-medium uppercase tracking-wide text-slate-400">
              {t('projectCard.readiness')}
            </span>
            <span className="text-2xl font-semibold tabular-nums text-slate-900">
              {project.overallPercent}%
            </span>
          </div>
          <ProgressBar value={project.overallPercent} />
        </div>

        <div className="mt-3 flex flex-wrap items-center justify-between gap-x-3 gap-y-1.5 md:mt-0 md:w-72 md:shrink-0 md:flex-col md:items-end md:justify-center">
          <ReportStatusBadge
            lastReportAt={project.lastReportAt}
            active={project.status === 'active'}
            waitingFor={project.firstWorkerName}
          />
          {hasIssues ? (
            <span className="inline-flex shrink-0 items-center gap-1 whitespace-nowrap rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">
              <TriangleAlert className="size-3.5" aria-hidden="true" />
              {t('projectCard.activeIssues', { count: project.activeIssueCount })}
            </span>
          ) : (
            <span className="shrink-0 whitespace-nowrap text-xs text-slate-500">{t('projectCard.noIssues')}</span>
          )}
        </div>
      </div>
    </Link>
  )
}
