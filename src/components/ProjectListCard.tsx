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
      className="block rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition-colors hover:border-sky-300"
    >
      <div className="md:flex md:items-center md:gap-5">
        <div className="min-w-0 md:flex-1">
          <div className="flex items-baseline justify-between gap-2 md:block">
            <span className="font-medium text-slate-900">{project.name}</span>
            <span className="text-lg font-semibold text-slate-900 md:hidden">
              {project.overallPercent}%
            </span>
          </div>
          <p className="mt-0.5 truncate text-sm text-slate-500">
            {project.address ?? 'Адрес не указан'}
            {project.status !== 'active' ? ` · ${PROJECT_STATUS_LABELS[project.status]}` : ''}
          </p>
        </div>

        <div className="mt-3 md:mt-0 md:w-44 md:shrink-0">
          <div className="mb-1 hidden items-center justify-between text-xs text-slate-400 md:flex">
            <span>готовность</span>
            <span className="tabular-nums">{project.overallPercent}%</span>
          </div>
          <ProgressBar value={project.overallPercent} />
        </div>

        <div className="mt-3 flex items-center justify-between gap-3 md:mt-0 md:w-56 md:shrink-0 md:justify-end">
          <span
            className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${
              hasIssues ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-500'
            }`}
          >
            <TriangleAlert className="size-3.5" aria-hidden="true" />
            {hasIssues ? `${project.activeIssueCount} активн.` : 'без проблем'}
          </span>
          <span
            className={`text-xs ${fresh.stale ? 'font-medium text-amber-600' : 'text-slate-400'}`}
          >
            {fresh.label}
          </span>
        </div>
      </div>
    </Link>
  )
}
