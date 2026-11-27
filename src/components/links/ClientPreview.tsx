import { useTranslation } from 'react-i18next'
import { stageLabel } from '../../i18n/stageLabel'
import { formatDateTimeSmart } from '../../lib/format'
import type { ClientViewData } from '../../lib/linksApi'
import { ProgressBar } from '../ui'

/**
 * What a client link shows, drawn from the same `client_project_view` answer.
 * Owner-side copy; agent «Б» owns the public `/c` screen (src/pages/ClientView*).
 */
export function ClientPreview({ data }: { data: ClientViewData }) {
  const { t } = useTranslation()
  return (
    <div className="flex flex-col gap-4" data-client-preview>
      <h3 className="m-0 text-h2 font-medium text-fg [overflow-wrap:anywhere]">{data.project_name}</h3>
      <p className="m-0 text-body font-medium text-fg">{/* `disclaimer` is an i18n key (contract); agent «Б» owns `client.*`, so fall back to our own copy. */}
        {t(data.disclaimer || 'client.disclaimer.percentNotPayment', { defaultValue: t('links.preview.disclaimer') })}</p>
      {data.stages.length === 0 ? (
        <p className="m-0 rounded-card border border-dashed border-line p-5 text-body text-fg">{t('links.preview.empty')}</p>
      ) : (
        <ul className="m-0 flex flex-col gap-3 p-0">
          {data.stages.map((s) => (
            <li key={s.stage_id} className="flex list-none flex-col gap-2 rounded-card border border-line p-4">
              <div className="flex items-baseline justify-between gap-3">
                <p className="m-0 min-w-0 text-field font-medium text-fg [overflow-wrap:anywhere]">{stageLabel(s.name)}</p>
                <p className="m-0 text-field font-medium text-fg num-col">{s.confirmed_percent}%</p>
              </div>
              <ProgressBar value={s.confirmed_percent} label={stageLabel(s.name)} />
              {s.updated_at ? <p className="m-0 text-body text-fg">{t('links.preview.updated', { when: formatDateTimeSmart(s.updated_at) })}</p> : null}
              {s.photos.some((p) => p.url) ? (
                <ul className="m-0 grid grid-cols-3 gap-2 p-0">
                  {s.photos.filter((p) => p.url).map((p) => (
                    <li key={p.path} className="list-none overflow-hidden rounded-control bg-surface">
                      <img src={p.url ?? ''} alt="" loading="lazy" className="block aspect-square w-full object-cover" />
                    </li>
                  ))}
                </ul>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
