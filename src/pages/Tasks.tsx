import { PagePlaceholder } from '../components/PagePlaceholder'

export function Tasks() {
  // TODO(tasks): load tasks for the project, grouped by status
  // (todo / in_progress / done). Mobile-first: single-column list with large
  // tap targets. GC/foreman can create and reassign; worker updates own status.
  return (
    <PagePlaceholder
      title="Задачи"
      description="Задачи по объекту с исполнителями, сроками и статусами"
    />
  )
}
