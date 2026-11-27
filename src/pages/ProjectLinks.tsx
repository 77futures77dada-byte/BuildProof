import { Navigate, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../hooks/useAuth'
import { NetBar } from '../components/ui'
import { LinkSection } from '../components/links/LinkSection'
import { ClientVisibility } from '../components/links/ClientVisibility'

/**
 * «Ссылки» (/project/:id/links, gc only): worker links, client links, what the
 * client sees. A separate tab from «Люди»: links are not accounts (no e-mail,
 * no profile), and the client block needs room for per-stage consent and the preview.
 */
export function ProjectLinks() {
  const { id } = useParams<{ id: string }>()
  const { profile } = useAuth()
  const { t } = useTranslation()
  if (profile && profile.role !== 'gc') return <Navigate to={`/project/${id}`} replace />
  if (!id) return null
  return (
    <section className="flex flex-col gap-8" aria-label={t('nav.links')}>
      <NetBar />
      <div className="grid gap-8 lg:grid-cols-2">
        <LinkSection kind="worker" projectId={id} />
        <LinkSection kind="client" projectId={id} />
      </div>
      <ClientVisibility projectId={id} />
    </section>
  )
}
