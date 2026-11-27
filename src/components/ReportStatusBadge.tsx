import { useTranslation } from 'react-i18next'
import { getReportStatus } from '../lib/reportStatus'
import { isEmailGateOpen } from '../lib/emailGate'
import type { ReportStatus } from '../lib/reportStatus'
import { StatusChip } from './ui/StatusChip'
import type { StatusKind } from './ui/StatusIcon'

/** Shape from 02-type §8: `stale` for days without a report (active only — pause turns red off), `noreports` for none. */
function kindOf(status: ReportStatus): StatusKind | null {
  if (status.kind === 'none') return 'noreports'
  if ((status.kind === 'late' || status.kind === 'overdue') && status.tone !== 'neutral') return 'stale'
  return null
}

export function ReportStatusBadge({
  lastReportAt,
  active,
  waitingFor,
}: {
  lastReportAt: string | null
  active: boolean
  /** Worker name for «ждём первый отчёт от …»; null → generic text. */
  waitingFor: string | null
}) {
  const { t } = useTranslation()
  const status = getReportStatus(lastReportAt, { active })

  const label =
    status.kind === 'today'
      ? t('reportStatus.today')
      : status.kind === 'yesterday'
        ? t('reportStatus.yesterday')
        : status.kind === 'late'
          ? t('reportStatus.late', { count: status.days ?? 0 })
          : status.kind === 'overdue'
            ? t('reportStatus.overdue', { count: status.days ?? 0 })
            : waitingFor
              ? t('reportStatus.noneWaiting', { names: waitingFor })
              : isEmailGateOpen() ? t('reportStatus.none') : t('reportStatus.noMarks')

  const kind = kindOf(status)
  if (kind) return <StatusChip kind={kind} className="min-w-0">{label}</StatusChip>
  return (
    <span className="inline-flex min-h-8 min-w-0 items-center rounded-chip border-2 border-line px-3 text-body font-medium text-fg">
      {label}
    </span>
  )
}
