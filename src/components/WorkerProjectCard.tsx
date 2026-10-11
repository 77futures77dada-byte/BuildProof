import { Link } from 'react-router-dom'
import { ChevronRight } from 'lucide-react'
import type { DashboardProject } from '../hooks/useProjects'
import { ProgressBar } from './ProgressBar'

/**
 * Big, single-tap project tile for a worker with several sites. Goes straight
 * to that site's "Сегодня" screen.
 */
export function WorkerProjectCard({ project }: { project: DashboardProject }) {
  return (
    <Link
      to={`/project/${project.id}/today`}
      className="flex min-h-20 items-center gap-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-slate-300 hover:shadow-md active:bg-slate-50"
    >
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-3">
          <span className="truncate text-lg font-semibold text-slate-900">{project.name}</span>
          <span className="shrink-0 text-xl font-semibold tabular-nums text-slate-900">
            {project.overallPercent}%
          </span>
        </div>
        {project.address ? (
          <p className="mt-0.5 truncate text-sm text-slate-500">{project.address}</p>
        ) : null}
        <ProgressBar value={project.overallPercent} className="mt-3" />
      </div>
      <ChevronRight className="size-6 shrink-0 text-slate-400" aria-hidden="true" />
    </Link>
  )
}
