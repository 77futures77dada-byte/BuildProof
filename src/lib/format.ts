/** Small formatting helpers shared across pages. */

const dateFmt = new Intl.DateTimeFormat('ru-RU', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
})

/** Format an ISO date/timestamp string as `dd.mm.yyyy`. Returns '—' for empty. */
export function formatDate(iso: string | null | undefined): string {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  return dateFmt.format(d)
}

/** Format a number as rubles without decimals. Returns '—' for null/undefined. */
export function formatMoney(value: number | null | undefined): string {
  if (value == null) return '—'
  return new Intl.NumberFormat('ru-RU', {
    style: 'currency',
    currency: 'RUB',
    maximumFractionDigits: 0,
  }).format(value)
}

const timeFmt = new Intl.DateTimeFormat('ru-RU', { hour: '2-digit', minute: '2-digit' })
const dayMonthFmt = new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'long' })
const dayMonthYearFmt = new Intl.DateTimeFormat('ru-RU', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
})

/**
 * Format a timestamp for an "last updated" label:
 * `сегодня в 14:32` for today, otherwise `23 августа в 14:32`
 * (the year is added only when it differs from the current one).
 */
export function formatDateTimeSmart(iso: string | null | undefined): string {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'

  const now = new Date()
  const time = timeFmt.format(d)
  const sameDay =
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  if (sameDay) return `сегодня в ${time}`

  const datePart =
    d.getFullYear() === now.getFullYear()
      ? dayMonthFmt.format(d)
      : dayMonthYearFmt.format(d)
  return `${datePart} в ${time}`
}

function pluralDays(n: number): string {
  const mod10 = n % 10
  const mod100 = n % 100
  if (mod10 === 1 && mod100 !== 11) return 'день'
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return 'дня'
  return 'дней'
}

export type FreshnessLevel = 'fresh' | 'stale' | 'old'

export interface Freshness {
  /** fresh → green dot, stale → yellow dot, old → red dot. */
  level: FreshnessLevel
  label: string
}

const DAY_MS = 24 * 60 * 60 * 1000

/**
 * "Last updated" freshness for the project overview:
 * - within 24h  → fresh,  `сегодня, 14:32` / `вчера, 14:32`
 * - 1–7 days    → stale,  `3 дня назад`
 * - > 7 days    → old,    `не обновлялось 8 дней`
 * - null/invalid → old,   `ещё не обновлялось`
 */
export function getUpdateFreshness(iso: string | null | undefined): Freshness {
  if (!iso) return { level: 'old', label: 'ещё не обновлялось' }
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return { level: 'old', label: 'ещё не обновлялось' }

  const now = new Date()
  const diffMs = now.getTime() - d.getTime()

  if (diffMs < DAY_MS) {
    const time = timeFmt.format(d)
    const sameDay =
      d.getFullYear() === now.getFullYear() &&
      d.getMonth() === now.getMonth() &&
      d.getDate() === now.getDate()
    return { level: 'fresh', label: `${sameDay ? 'сегодня' : 'вчера'}, ${time}` }
  }

  const diffDays = Math.floor(diffMs / DAY_MS)
  if (diffDays <= 7) {
    return { level: 'stale', label: `${diffDays} ${pluralDays(diffDays)} назад` }
  }
  return { level: 'old', label: `не обновлялось ${diffDays} ${pluralDays(diffDays)}` }
}

export interface ReportFreshness {
  /** true → risk signal (amber text), false → neutral. */
  stale: boolean
  label: string
}

/**
 * Compact "last field report" label for the dashboard project card:
 * `обновлён сегодня` / `обновлён вчера` / `обновлён 4 дня назад`,
 * and — as a risk signal — `нет отчётов 9 дней` past a week or
 * `отчётов пока нет` when nothing has ever been reported.
 */
export function getReportFreshness(iso: string | null | undefined): ReportFreshness {
  if (!iso) return { stale: true, label: 'отчётов пока нет' }
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return { stale: true, label: 'отчётов пока нет' }

  const now = new Date()
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const startOfUpdateDay = new Date(d.getFullYear(), d.getMonth(), d.getDate())
  const daysAgo = Math.round(
    (startOfToday.getTime() - startOfUpdateDay.getTime()) / DAY_MS,
  )

  if (daysAgo <= 0) return { stale: false, label: 'обновлён сегодня' }
  if (daysAgo === 1) return { stale: false, label: 'обновлён вчера' }
  if (daysAgo <= 7) return { stale: false, label: `обновлён ${daysAgo} ${pluralDays(daysAgo)} назад` }
  return { stale: true, label: `нет отчётов ${daysAgo} ${pluralDays(daysAgo)}` }
}

/** Turn an unknown thrown value into a user-facing message. */
export function toErrorMessage(err: unknown): string {
  if (err instanceof Error) return err.message
  if (typeof err === 'string') return err
  return 'Произошла непредвиденная ошибка. Попробуйте ещё раз.'
}
