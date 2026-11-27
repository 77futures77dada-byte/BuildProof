import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { formatDateTimeSmart } from '../../lib/format'
import type { WorkerLinkReport } from '../../lib/linkTransport'
import { EmptyState, PhotoViewer, ReportCard } from '../ui'
import type { StatusKind } from '../ui'

const STATUS: Record<string, StatusKind> = { accepted: 'accepted', pending: 'pending', confirmed: 'verified', rejected: 'returned' }

interface LinkRecentReportsProps {
  reports: WorkerLinkReport[] | null
  stageName: (id: string) => string
  error: string | null
}

/** «Мои последние отчёты»: status, %, time, thumbnails (signed URLs). DOM hook: `[data-link-reports]`. */
export function LinkRecentReports({ reports, stageName, error }: LinkRecentReportsProps) {
  const { t } = useTranslation()
  const [open, setOpen] = useState<{ report: WorkerLinkReport; index: number } | null>(null)

  const statusLabel = (s: string) => (s in STATUS ? t(`workerLink.status.${s}`) : s)
  const photo = open ? open.report.photos[open.index] : null

  return (
    <section data-link-reports aria-labelledby="link-reports-title" className="flex flex-col gap-3">
      <h2 id="link-reports-title" className="m-0 text-h3 font-medium text-fg">{t('workerLink.recentTitle')}</h2>
      {error ? <p role="alert" className="m-0 text-body font-medium text-fg">{error}</p> : null}
      {reports === null && !error ? <p className="m-0 text-body text-fg">{t('common.loadingEllipsis')}</p> : null}
      {reports && reports.length === 0 ? (
        <EmptyState text={t('workerLink.recentEmpty')} who={t('workerLink.recentEmptyWho')} />
      ) : null}
      {reports && reports.length ? (
        <ul className="m-0 flex list-none flex-col gap-2 p-0">
          {reports.map((r) => {
            const first = r.photos.find((p) => p.url) ?? null
            const name = stageName(r.stage_id)
            return (
              <li key={r.id}>
                <ReportCard
                  variant="mine"
                  stage={name}
                  to={r.claimed_percent}
                  sentAt={formatDateTimeSmart(r.uploaded_at ?? r.created_at)}
                  status={{ kind: STATUS[r.status] ?? 'accepted', label: statusLabel(r.status) }}
                  reason={r.photos.length > 1 ? t('workerLink.photoTotal', { count: r.photos.length }) : undefined}
                  photoUrl={first?.url ?? null}
                  photoAlt={t('workerLink.photoAlt', { stage: name })}
                  onOpenPhoto={first ? () => setOpen({ report: r, index: r.photos.indexOf(first) }) : undefined}
                />
              </li>
            )
          })}
        </ul>
      ) : null}
      {open ? (
        <PhotoViewer
          open
          onClose={() => setOpen(null)}
          title={stageName(open.report.stage_id)}
          src={photo?.url ?? null}
          alt={t('workerLink.photoAlt', { stage: stageName(open.report.stage_id) })}
          caption={`${open.index + 1} / ${open.report.photos.length} · ${formatDateTimeSmart(open.report.uploaded_at ?? open.report.created_at)}`}
          failedLabel={t('workerLink.thumbFailed')}
          {...(open.report.photos.length > 1 ? {
            onPrev: () => setOpen({ ...open, index: (open.index - 1 + open.report.photos.length) % open.report.photos.length }),
            onNext: () => setOpen({ ...open, index: (open.index + 1) % open.report.photos.length }),
            prevLabel: t('workerLink.prevPhoto'),
            nextLabel: t('workerLink.nextPhoto'),
          } : {})}
        />
      ) : null}
    </section>
  )
}
