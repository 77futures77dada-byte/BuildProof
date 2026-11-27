import { Link, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { isEmailGateOpen } from '../lib/emailGate'
import { buttonClass } from './ui'

/**
 * «Пригласить рабочего» → «Люди» (`/project/:id/settings#invite`), only when
 * the email gate is open (residual И4-HIGH: no WhatsApp link to /login).
 * Gate closed → nothing; day 0 is «Отметить первый этап» on the overview.
 * `projectName` is kept for the existing call site and not used.
 */
export function InviteWorkerLink(props: { projectName?: string; projectId?: string }) {
  const { t } = useTranslation()
  const params = useParams<{ id: string }>()
  const id = props.projectId ?? params.id
  if (!isEmailGateOpen() || !id) return null
  return (
    <Link to={`/project/${id}/settings#invite`} className={buttonClass({ variant: 'secondary' })}>
      {t('overview.next.inviteOpen')}
    </Link>
  )
}
