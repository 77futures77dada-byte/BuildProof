import { PagePlaceholder } from '../components/PagePlaceholder'

export function Stages() {
  // TODO(stages): load project_stages joined with stage_templates, ordered by
  // sort_order. GC/foreman can edit progress_percent (writes stage_history);
  // client sees read-only progress bars.
  return (
    <PagePlaceholder
      title="Этапы"
      description="Прогресс по 7 этапам: Фундамент, Каркас, Кровля, Окна, Электрика, Сантехника, Отделка"
    />
  )
}
