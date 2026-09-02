import { PagePlaceholder } from '../components/PagePlaceholder'

export function Dashboard() {
  // Real project list + "create project" flow is added with the dashboard feature.
  return (
    <div className="mx-auto max-w-4xl p-6">
      <PagePlaceholder title="Объекты" description="Список строительных объектов" />
    </div>
  )
}
