import { useTranslation } from 'react-i18next'
import { getReportStatus } from '../lib/reportStatus'
import type { ReportStatus } from '../lib/reportStatus'

const TONE_TEXT: Record<ReportStatus['tone'], string> = {
  ok: 'text-green-800',
  neutral: 'text-slate-600',
  warn: 'text-amber-800',
  alert: 'font-semibold text-red-700',
}

/** Shape carries the meaning together with the text, so colour is never alone. */
function Shape({ status }: { status: ReportStatus }) {
  const base = 'inline-block size-2.5 shrink-0'
  if (status.kind === 'today') return <span aria-hidden="true" className={`${base} rounded-full bg-green-600`} />
  if (status.kind === 'overdue' && status.tone === 'alert')
    return <span aria-hidden="true" className={`${base} rounded-[2px] bg-red-600`} />
  if (status.kind === 'late' || status.kind === 'overdue')
    return (
      <span
        aria-hidden="true"
        className={`${base} ${status.tone === 'warn' ? 'bg-amber-500' : 'bg-slate-400'}`}
        style={{ clipPath: 'polygon(50% 0, 100% 100%, 0 100%)' }}
      />
    )
  return <span aria-hidden="true" className={`${base} rounded-full border-2 border-slate-400`} />
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
              ? t('reportStatus.noneWaiting', { name: waitingFor })
              : t('reportStatus.none')

  return (
    <span className={`inline-flex min-w-0 items-center gap-1.5 text-xs ${TONE_TEXT[status.tone]}`}>
      <Shape status={status} />
      <span className="min-w-0">{label}</span>
    </span>
  )
}
