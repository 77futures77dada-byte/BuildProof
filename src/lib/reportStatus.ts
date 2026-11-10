/**
 * Report status of a project for the project list. Always rendered as a shape
 * plus text (never colour alone):
 *
 * - `today`     ● green   «Отчёт сегодня»
 * - `yesterday` ○ grey    «Отчёт вчера»
 * - `late`      ▲ amber   «2 дня без отчёта» (2–4 calendar days)
 * - `overdue`   ■ red     «5+ дней без отчёта» (5 and more)
 * - `none`      ○ grey    «Отчётов пока нет…»
 *
 * A paused or finished project is never `late`/`overdue`: silence there is
 * expected, so it falls back to the `neutral` tone.
 */
export type ReportStatusKind = 'today' | 'yesterday' | 'late' | 'overdue' | 'none'

export interface ReportStatus {
  kind: ReportStatusKind
  /** Whole calendar days since the last report; 0 for today, null when none. */
  days: number | null
  /** Visual tone; `quiet` when the project is not active. */
  tone: 'ok' | 'neutral' | 'warn' | 'alert'
}

export const OVERDUE_DAYS = 5

const DAY_MS = 24 * 60 * 60 * 1000

function startOfDay(d: Date): number {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()
}

export function getReportStatus(
  lastReportAt: string | null | undefined,
  { active = true, now = new Date() }: { active?: boolean; now?: Date } = {},
): ReportStatus {
  const d = lastReportAt ? new Date(lastReportAt) : null
  if (!d || Number.isNaN(d.getTime())) return { kind: 'none', days: null, tone: 'neutral' }

  const days = Math.max(0, Math.round((startOfDay(now) - startOfDay(d)) / DAY_MS))
  if (days === 0) return { kind: 'today', days, tone: 'ok' }
  if (days === 1) return { kind: 'yesterday', days, tone: 'neutral' }
  if (days < OVERDUE_DAYS) return { kind: 'late', days, tone: active ? 'warn' : 'neutral' }
  return { kind: 'overdue', days, tone: active ? 'alert' : 'neutral' }
}
