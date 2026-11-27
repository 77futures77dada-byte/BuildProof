import { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ClientProjectView } from '../components/client/ClientProjectView'
import { ContactLines } from '../components/ContactLines'
import { LinkPageShell, LinkProblem } from '../components/workerlink/LinkPageShell'
import { useLinkPageMeta } from '../components/workerlink/useLinkPageMeta'
import { Button, NetBar, SkeletonRows } from '../components/ui'
import { forgetLinkToken, takeLinkSession } from '../lib/linkSession'
import { fetchClientView, LinkApiError, linkLoadErrorKey } from '../lib/linkTransport'
import type { ClientViewData } from '../lib/linkTransport'
import { applyRoleTheme } from '../lib/theme'

type Load = { state: 'loading' } | { state: 'ready'; data: ClientViewData } | { state: 'error'; code: string }

/** Client page by link (`/c#t=<token>`): read-only progress, no account. */
export default function ClientViewPage() {
  const { t } = useTranslation()
  const [session] = useState(() => takeLinkSession('client'))
  const [load, setLoad] = useState<Load>({ state: 'loading' })
  useEffect(() => { applyRoleTheme('client') }, [])
  useLinkPageMeta()

  const token = session?.token ?? null
  const run = useCallback(async () => {
    if (!token) return
    try {
      setLoad({ state: 'ready', data: await fetchClientView(token) })
    } catch (err) {
      const code = err instanceof LinkApiError ? err.code : 'network'
      // A revoked / expired link: never keep the dead token on this device.
      if (code === 'invalid_client_link') forgetLinkToken('client')
      setLoad({ state: 'error', code })
    }
  }, [token])
  // oxlint-disable-next-line react/set-state-in-effect -- initial fetch
  useEffect(() => { void run() }, [run])

  const title = load.state === 'ready' ? load.data.project_name : t('clientView.title')
  return (
    <LinkPageShell title={title}>
      <NetBar />
      {!session ? <LinkProblem kind="missing" />
        : load.state === 'loading' ? <SkeletonRows label={t('common.loading')} />
        : load.state === 'error' ? (
          load.code === 'invalid_client_link' ? <LinkProblem kind="invalid" /> : (
            <div className="flex flex-col items-start gap-3">
              <p role="alert" className="m-0 text-field font-medium text-fg">{t(linkLoadErrorKey(load.code))}</p>
              <Button variant="secondary" onClick={() => { setLoad({ state: 'loading' }); void run() }}>{t('common.retry')}</Button>
            </div>
          )
        ) : (
          <>
            <ClientProjectView data={load.data} />
            {/* who answers questions: the contractor; BuildProof support only when legal.ts is filled */}
            <section data-client-contact className="flex flex-col gap-2 border-t border-line pt-4">
              <p className="m-0 text-body font-medium text-fg">{t('clientView.askContractor')}</p>
              <ContactLines label={t('common.supportLabel')} />
            </section>
          </>
        )}
    </LinkPageShell>
  )
}
