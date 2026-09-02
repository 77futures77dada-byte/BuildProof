import { Link } from 'react-router-dom'
import { TriangleAlert } from 'lucide-react'
import type { DashboardProject } from '../hooks/useProjects'
import { PROJECT_STATUS_LABELS } from '../types'
import { getReportFreshness } from '../lib/format'
import { ProgressBar } from './ProgressBar'

/**
 * Dashboard project row: overall %, open-issue count and a freshness signal.
 * Dense single row on desktop, stacked card on a phone.
 */
export function ProjectListCard({ project }: { project: DashboardProject }) {
  const fresh = getReportFreshness(project.lastReportAt)
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
            {project.address ?? 'Адрес не указан'}
            {project.status !== 'active' ? ` · ${PROJECT_STATUS_LABELS[project.status]}` : ''}
          </p>
        </div>

        <div className="mt-3 md:mt-0 md:w-44 md:shrink-0">
          <div className="mb-1 hidden items-baseline justify-between md:flex">
            <span className="text-[11px] font-medium uppercase tracking-wide text-slate-400">
              Готовность
            </span>
            <span className="text-2xl font-semibold tabular-nums text-slate-900">
              {project.overallPercent}%
            </span>
          </div>
          <ProgressBar value={project.overallPercent} />
        </div>

        <div className="mt-3 flex items-center justify-between gap-3 md:mt-0 md:w-64 md:shrink-0 md:justify-end">
          <span
            className={`inline-flex shrink-0 items-center gap-1 whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium ${
              hasIssues ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-600'
            }`}
          >
            <TriangleAlert className="size-3.5" aria-hidden="true" />
            {hasIssues ? `${project.activeIssueCount} активн.` : 'без проблем'}
          </span>
          {fresh.stale ? (
            <span className="shrink-0 whitespace-nowrap rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">
              {fresh.label}
            </span>
          ) : (
            <span className="shrink-0 whitespace-nowrap text-xs text-slate-400">{fresh.label}</span>
          )}
        </div>
      </div>
    </Link>
  )
}
