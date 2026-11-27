import { useTranslation } from 'react-i18next'
import type { DashboardProject } from '../hooks/useProjects'
import { freshnessView } from '../lib/freshness'
import { formatDate } from '../lib/format'
import { FreshnessChip, ProjectCard } from './ui'

/**
 * Dashboard project card (03 §4.1): name, address, figure + bar, freshness chip
 * and open issues. The whole card is one link; a table-like row from 1024 px.
 */
export function ProjectListCard({ project }: { project: DashboardProject }) {
  const { t } = useTranslation()
  const fresh = freshnessView(project, t, { fmt: formatDate })
  return (
    <ProjectCard
      to={`/project/${project.id}`}
      layout="row"
      className="min-h-24"
      name={project.name}
      subtitle={project.address ?? t('projectCard.noAddress')}
      percent={project.overallPercent}
      badges={
        <>
          <FreshnessChip icon={fresh.icon}>{fresh.label}</FreshnessChip>
          {project.activeIssueCount > 0 ? (
            <FreshnessChip>{t('projectCard.activeIssues', { count: project.activeIssueCount })}</FreshnessChip>
          ) : null}
        </>
      }
    />
  )
}
