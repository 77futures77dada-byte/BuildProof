import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import type { TFunction } from 'i18next'
import { stageLabel } from '../i18n/stageLabel'
import { useAuth } from '../hooks/useAuth'
import { useProjectStages } from '../hooks/useProjectStages'
import type { EditableStage } from '../hooks/useProjectStages'
import { useStageHistory } from '../hooks/useStageHistory'
import { useLastMarks } from '../hooks/useLastMarks'
import type { LastMark } from '../hooks/useLastMarks'
import { formatDate, formatDateTimeSmart } from '../lib/format'
import { Button, Disclosure, NetBar, StageRow, StatusIcon } from '../components/ui'
import type { ChipSpec } from '../components/ui'
import { StageMarkSheet } from '../components/report/StageMarkSheet'
import { Spinner } from '../components/Spinner'
import { ErrorMessage } from '../components/ErrorMessage'

/** Who marked it — only what the current code knows (residual И4-М2; K15 statuses later). */
function markedBy(mark: LastMark, t: TFunction): string {
  const who = mark.role === 'gc'
    ? t('status.markedByOwner')
    : mark.role === 'foreman' ? t('status.markedByForeman') : t('status.markedByCrew')
  return [who, formatDate(mark.changedAt), mark.name].filter(Boolean).join(' · ')
}

export function Stages() {
  const { id } = useParams<{ id: string }>()
  const { profile } = useAuth()
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { stages, loading, error, reload, commitPercent, historyToken } = useProjectStages(id)
  const marks = useLastMarks(id, historyToken)
  const [marking, setMarking] = useState<EditableStage | null>(null)

  const role = profile?.role
  const manager = role === 'gc' || role === 'foreman'
  const worker = role === 'worker'

  if (loading) return <Spinner label={t('stages.loading')} />
  if (error) return <ErrorMessage message={error} onRetry={reload} />

  return (
    <section className="flex flex-col gap-4">
      <NetBar />
      <h2 className="m-0 text-h2 font-bold text-fg">{t('stages.title')}</h2>

      {stages.length === 0 ? (
        <p className="m-0 rounded-card border-2 border-dashed border-line p-5 text-body font-medium text-fg">
          {role === 'gc' ? t('stages.emptyOwner') : t('stages.emptyAsk')}
        </p>
      ) : (
        <ul className="m-0 flex flex-col p-0">
          {stages.map((stage) => {
            const name = stageLabel(stage.name)
            const mark = marks.get(stage.id)
            const status: ChipSpec | undefined = mark ? undefined : { kind: 'noreports', label: t('reportStatus.noMarks') }
            const action = manager || worker ? (
              <Button
                variant="secondary"
                aria-label={t('stages.markFor', { stage: name })}
                onClick={() => (manager ? setMarking(stage) : navigate(`/project/${id}/today`))}
              >
                {t('stages.mark')}
              </Button>
            ) : null
            return (
              <StageRow
                key={stage.id}
                variant={action ? 'stages' : 'readonly'}
                name={name}
                percent={stage.progressPercent}
                meta={mark ? markedBy(mark, t) : undefined}
                status={status}
                actions={action}
              >
                <StageHistory stageId={stage.id} refreshToken={historyToken} />
              </StageRow>
            )
          })}
        </ul>
      )}

      <StageMarkSheet stage={marking} onClose={() => setMarking(null)} onSave={commitPercent} />
    </section>
  )
}

function StageHistory({ stageId, refreshToken }: { stageId: string; refreshToken: number }) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const { entries, loading, error } = useStageHistory(stageId, open, refreshToken)
  return (
    <Disclosure label={t('stages.history')} onToggle={setOpen}>
      {open ? (
        loading ? (
          <p className="m-0 text-body font-medium text-fg">{t('stages.historyLoading')}</p>
        ) : error ? (
          <p role="alert" className="m-0 flex items-center gap-2 text-body font-semibold text-fg"><StatusIcon kind="error" />{t('common.unexpectedError')}</p>
        ) : entries.length === 0 ? (
          <p className="m-0 text-body font-medium text-fg">{t('stages.historyEmpty')}</p>
        ) : (
          <ul className="m-0 flex flex-col gap-2 p-0">
            {entries.map((e) => (
              <li key={e.id} className="flex list-none flex-col rounded-control bg-surface px-3 py-2">
                <span className="text-body font-semibold text-fg num-col">{t('stages.historyEntry', { from: e.oldPercent, to: e.newPercent })}</span>
                <span className="text-body font-medium text-fg">
                  <span className="num-col">{formatDateTimeSmart(e.changedAt)}</span>
                  {' · '}{e.changedByName ?? t('stages.unknownUser')}
                </span>
              </li>
            ))}
          </ul>
        )
      ) : null}
    </Disclosure>
  )
}
