import { useParams } from 'react-router-dom'
import { PagePlaceholder } from '../components/PagePlaceholder'

export function ProjectDashboard() {
  const { id } = useParams<{ id: string }>()

  // TODO(project-overview): load the project row + its 7 project_stages
  // (join stage_templates for name/order) and render the progress summary,
  // deadline, budget and recent activity.
  return (
    <PagePlaceholder
      title="Обзор объекта"
      description={`Сводный прогресс, дедлайн и последние события по объекту ${id ?? ''}`}
    />
  )
}
