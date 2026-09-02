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

/** Turn an unknown thrown value into a user-facing message. */
export function toErrorMessage(err: unknown): string {
  if (err instanceof Error) return err.message
  if (typeof err === 'string') return err
  return 'Произошла непредвиденная ошибка. Попробуйте ещё раз.'
}
