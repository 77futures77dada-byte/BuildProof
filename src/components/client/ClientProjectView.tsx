import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { formatDate } from '../../lib/format'
import type { ClientViewData } from '../../lib/linkTransport'
import { EmptyState, PhotoViewer, ProgressBar } from '../ui'
import { disclaimerKeyFor } from './disclaimer'

interface ClientProjectViewProps {
  /** Response of GET /api/client-view (client link) or POST /api/client-view (owner preview). */
  data: ClientViewData
  /** Show the object name as a heading (off when the page header already shows it). */
  showTitle?: boolean
}

/**
 * What the client sees (docs/contracts/client-links.md): only what the API
 * returned — visible stages with a confirmed %, date and photos with consent.
 * Reused by the owner preview. DOM hook: `[data-client-view]`.
 */
export function ClientProjectView({ data, showTitle = false }: ClientProjectViewProps) {
  const { t, i18n } = useTranslation()
  const [open, setOpen] = useState<{ stage: number; photo: number } | null>(null)
  const disclaimerKey = disclaimerKeyFor(data.disclaimer, (k) => i18n.exists(k))
  const stage = open ? data.stages[open.stage] : null
  const photo = stage && open ? stage.photos[open.photo] : null

  return (
    <div data-client-view className="flex flex-col gap-4 text-fg">
      {showTitle ? <h2 className="m-0 text-h2 font-medium [overflow-wrap:anywhere]">{data.project_name}</h2> : null}
      <p data-client-disclaimer className="m-0 rounded-card border border-line bg-surface p-3 text-body font-medium">{t(disclaimerKey)}</p>

      {data.stages.length === 0 ? (
        <EmptyState text={t('clientView.empty')} who={t('clientView.emptyWho')} />
      ) : (
        <ul className="m-0 flex list-none flex-col p-0" data-client-stages>
          {data.stages.map((s, si) => {
            const pct = Math.round(s.confirmed_percent)
            const shown = s.photos.filter((p) => p.url)
            const missing = s.photos.length - shown.length
            return (
              <li key={s.stage_id} className="flex flex-col gap-2 border-b border-line py-3 last:border-b-0">
                <div className="flex items-baseline justify-between gap-3">
                  <span className="min-w-0 text-field font-medium [overflow-wrap:anywhere]">{s.name}</span>
                  <span className="num-col shrink-0 text-field font-medium">{pct}%</span>
                </div>
                <ProgressBar value={pct} label={t('clientView.confirmed', { percent: pct })} />
                {/* the figure is shown once (right); this line says what it is and when (critic r1 3.1) */}
                <p className="m-0 text-body">
                  {s.updated_at ? t('clientView.confirmedOn', { date: formatDate(s.updated_at) }) : t('clientView.confirmedPlain')}
                </p>
                {shown.length ? (
                  <ul className="m-0 flex list-none flex-wrap gap-2 p-0">
                    {s.photos.map((p, pi) => (p.url ? (
                      <li key={p.path}>
                        <button
                          type="button"
                          onClick={() => setOpen({ stage: si, photo: pi })}
                          className="block rounded-control focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-focus"
                        >
                          <img src={p.url} alt={t('clientView.photoAlt', { stage: s.name })} loading="lazy" className="size-[72px] rounded-control border border-line bg-surface object-cover" />
                        </button>
                      </li>
                    ) : null))}
                  </ul>
                ) : null}
                {missing > 0 ? <p className="m-0 text-body">{t('clientView.photoUnavailable')}</p> : null}
              </li>
            )
          })}
        </ul>
      )}

      {stage && open ? (
        <PhotoViewer
          open
          onClose={() => setOpen(null)}
          title={stage.name}
          src={photo?.url ?? null}
          alt={t('clientView.photoAlt', { stage: stage.name })}
          caption={`${open.photo + 1} / ${stage.photos.length}`}
          failedLabel={t('clientView.photoFailed')}
          {...(stage.photos.length > 1 ? {
            onPrev: () => setOpen({ ...open, photo: (open.photo - 1 + stage.photos.length) % stage.photos.length }),
            onNext: () => setOpen({ ...open, photo: (open.photo + 1) % stage.photos.length }),
            prevLabel: t('workerLink.prevPhoto'),
            nextLabel: t('workerLink.nextPhoto'),
          } : {})}
        />
      ) : null}
    </div>
  )
}
