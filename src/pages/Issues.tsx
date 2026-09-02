import { PagePlaceholder } from '../components/PagePlaceholder'

export function Issues() {
  // TODO(issues): load issues for the project ordered by priority then due_date.
  // Client and GC can raise an issue (title, description, photo, priority,
  // responsible_party); status flows open -> in_progress -> resolved.
  return (
    <PagePlaceholder
      title="Проблемы"
      description="Замечания и проблемы по объекту с приоритетом, ответственным и сроком устранения"
    />
  )
}
