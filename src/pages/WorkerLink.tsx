import { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { SendOutcome } from '../lib/drafts'
import { takeLinkSession } from '../lib/linkSession'
import { fetchWorkerReports, fetchWorkerStages, LinkApiError, linkLoadErrorKey } from '../lib/linkTransport'
import type { WorkerLinkReport, WorkerLinkStages } from '../lib/linkTransport'
import { applyRoleTheme } from '../lib/theme'
import { Button, NetBar, SkeletonRows, StageRow, StatusIcon, EmptyState } from '../components/ui'
import { LinkDraftList } from '../components/workerlink/LinkDraftList'
import { LinkPageShell, LinkProblem } from '../components/workerlink/LinkPageShell'
import { LinkRecentReports } from '../components/workerlink/LinkRecentReports'
import { LinkReportSheet } from '../components/workerlink/LinkReportSheet'
import { useLinkDrafts } from '../components/workerlink/useLinkDrafts'

type Load = { state: 'loading' } | { state: 'ready'; data: WorkerLinkStages } | { state: 'error'; code: string }

const codeOf = (err: unknown) => (err instanceof LinkApiError ? err.code : 'network')

/**
 * Worker page by link (`/w#t=<token>`, docs/contracts/worker-links.md): no
 * account, no Supabase session. Name, stages with %, report with photos,
 * reports still on the phone, own recent reports.
 */
export default function WorkerLinkPage() {
  const [session] = useState(() => takeLinkSession('worker'))
  useEffect(() => { applyRoleTheme('worker') }, [])
  if (!session) {
    return <WorkerShell><LinkProblem kind="missing" /></WorkerShell>
  }
  return <WorkerLinkBody token={session.token} owner={session.localId} />
}

function WorkerShell({ name, children }: { name?: string; children: React.ReactNode }) {
  const { t } = useTranslation()
  return <LinkPageShell title={t('workerLink.title')} subtitle={name ? t('workerLink.worker', { name }) : undefined}>{children}</LinkPageShell>
}

function WorkerLinkBody({ token, owner }: { token: string; owner: string }) {
  const { t } = useTranslation()
  const [load, setLoad] = useState<Load>({ state: 'loading' })
  const [reports, setReports] = useState<WorkerLinkReport[] | null>(null)
  const [reportsError, setReportsError] = useState<string | null>(null)
  const [sheet, setSheet] = useState<{ stageId: string | null } | null>(null)
  const [notice, setNotice] = useState<SendOutcome | null>(null)
  const q = useLinkDrafts(token, owner)

  const loadStages = useCallback(async () => {
    try {
      setLoad({ state: 'ready', data: await fetchWorkerStages(token) })
    } catch (err) {
      setLoad((prev) => (prev.state === 'ready' && codeOf(err) !== 'invalid_worker_link' ? prev : { state: 'error', code: codeOf(err) }))
    }
  }, [token])
  const loadReports = useCallback(async () => {
    try {
      setReports(await fetchWorkerReports(token, 20))
      setReportsError(null)
    } catch (err) {
      setReportsError(t(linkLoadErrorKey(codeOf(err))))
    }
  }, [token, t])

  useEffect(() => {
    // oxlint-disable-next-line react/set-state-in-effect -- initial fetch
    void loadStages()
    void loadReports()
  }, [loadStages, loadReports])

  // A sent report changes stage % and the report list.
  const sentCount = Object.values(q.outcomes).filter((o) => o.result !== 'failed' && o.result !== 'stale').length
  useEffect(() => {
    if (!sentCount) return
    // oxlint-disable-next-line react/set-state-in-effect -- refetch after a send
    void loadStages()
    void loadReports()
  }, [sentCount, loadStages, loadReports])

  useEffect(() => {
    if (!notice || notice.result === 'failed') return
    const id = setTimeout(() => setNotice(null), 6000)
    return () => clearTimeout(id)
  }, [notice])

  const data = load.state === 'ready' ? load.data : null
  const invalid = (load.state === 'error' && load.code === 'invalid_worker_link')
    || q.drafts.some((d) => d.lastError === 'auth')
  const stageName = (id: string) => data?.stages.find((s) => s.id === id)?.name
    ?? q.drafts.find((d) => d.stageId === id)?.stageName ?? t('workerLink.stageUnknown')
  const title = data && 'project_name' in data && typeof (data as { project_name?: unknown }).project_name === 'string'
    ? (data as { project_name: string }).project_name : t('workerLink.title')

  return (
    <LinkPageShell title={title} subtitle={data ? t('workerLink.worker', { name: data.worker_name }) : undefined}>
      <NetBar />
      {invalid ? <LinkProblem kind="invalid" /> : null}

      {notice ? (
        <p role="status" data-link-notice={notice.result} className="m-0 flex items-start gap-2 rounded-card border border-line bg-surface p-4 text-field font-medium text-fg">
          <StatusIcon kind={notice.result === 'failed' ? 'queued' : 'sent'} className="mt-0.5" />
          {notice.result === 'failed' ? t('workerLink.state.queued')
            : notice.result === 'stale' ? t('send.stale', { percent: notice.percent })
            : notice.result === 'stageAhead' ? t('send.stageAhead', { percent: notice.percent })
            : t('workerLink.state.sent')}
        </p>
      ) : null}

      <LinkDraftList drafts={q.drafts} inFlight={q.inFlight} stopped={q.stopped} onRetry={q.retryNow} sendNow={q.sendNow} />

      {data && !invalid ? (
        <Button variant="primary" block onClick={() => setSheet({ stageId: null })} disabled={!data.stages.length}>
          {t('workerLink.newReport')}
        </Button>
      ) : null}

      <section aria-labelledby="link-stages-title" className="flex flex-col gap-3">
        <h2 id="link-stages-title" className="m-0 text-h3 font-medium text-fg">{t('workerLink.stagesTitle')}</h2>
        {load.state === 'loading' ? <SkeletonRows label={t('common.loading')} /> : null}
        {load.state === 'error' && !invalid ? (
          <div className="flex flex-col items-start gap-3">
            <p role="alert" className="m-0 text-field font-medium text-fg">{t(linkLoadErrorKey(load.code))}</p>
            <Button variant="secondary" onClick={() => { setLoad({ state: 'loading' }); void loadStages() }}>{t('common.retry')}</Button>
          </div>
        ) : null}
        {data && data.stages.length === 0 ? (
          <EmptyState text={t('workerLink.noStages')} who={t('workerLink.noStagesWho')} />
        ) : null}
        {data && data.stages.length ? (
          <ul className="m-0 flex list-none flex-col p-0" data-link-stages>
            {data.stages.map((s) => (
              <StageRow
                key={s.id}
                name={s.name}
                percent={s.progress_percent}
                variant="stages"
                onPress={invalid ? undefined : () => setSheet({ stageId: s.id })}
              />
            ))}
          </ul>
        ) : null}
      </section>

      <LinkRecentReports reports={reports} stageName={stageName} error={reportsError} />

      {data ? (
        <LinkReportSheet
          open={!!sheet}
          stages={data.stages}
          projectId={data.project_id}
          owner={owner}
          drafts={q.drafts}
          initialStageId={sheet?.stageId ?? null}
          sendNow={q.sendNow}
          onClose={() => setSheet(null)}
          onDone={(o) => { setSheet(null); setNotice(o) }}
        />
      ) : null}
    </LinkPageShell>
  )
}


