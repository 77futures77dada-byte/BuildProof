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

/** Turn an unknown thrown value into a user-facing message. */
export function toErrorMessage(err: unknown): string {
  if (err instanceof Error) return err.message
  if (typeof err === 'string') return err
  return 'Произошла непредвиденная ошибка. Попробуйте ещё раз.'
}
