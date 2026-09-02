import { PagePlaceholder } from '../components/PagePlaceholder'

export function Settings() {
  // TODO(settings): edit project fields (name, address, deadline, budget,
  // status) for GC; manage project_access (who can see this object).
  return (
    <PagePlaceholder
      title="Настройки объекта"
      description="Реквизиты объекта, дедлайн, бюджет и доступ участников"
    />
  )
}
