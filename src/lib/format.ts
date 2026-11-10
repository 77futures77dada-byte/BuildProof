/** Small formatting helpers shared across pages. All output follows the UI language. */

import i18n, { intlTag } from '../i18n'

// Intl formatters are relatively costly to build; cache one per locale + options.
const formatterCache = new Map<string, Intl.DateTimeFormat>()

function dateTimeFormat(options: Intl.DateTimeFormatOptions): Intl.DateTimeFormat {
  const tag = intlTag()
  const key = `${tag}|${JSON.stringify(options)}`
  let fmt = formatterCache.get(key)
  if (!fmt) {
    fmt = new Intl.DateTimeFormat(tag, options)
    formatterCache.set(key, fmt)
  }
  return fmt
}

const DATE_OPTS: Intl.DateTimeFormatOptions = { day: '2-digit', month: '2-digit', year: 'numeric' }
const TIME_OPTS: Intl.DateTimeFormatOptions = { hour: '2-digit', minute: '2-digit' }
const DAY_MONTH_OPTS: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'long' }
const DAY_MONTH_YEAR_OPTS: Intl.DateTimeFormatOptions = {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
}

function parse(iso: string | null | undefined): Date | null {
  if (!iso) return null
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? null : d
}

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  )
}

/** Short numeric date in the UI locale (e.g. 23.08.2026). Returns '—' for empty. */
export function formatDate(iso: string | null | undefined): string {
  const d = parse(iso)
  return d ? dateTimeFormat(DATE_OPTS).format(d) : i18n.t('common.notSet')
}

/**
 * Timestamp for a "last updated" label: "today at 14:32" for today, otherwise
 * "23 August at 14:32" (the year only when it differs from the current one).
 */
export function formatDateTimeSmart(iso: string | null | undefined): string {
  const d = parse(iso)
  if (!d) return i18n.t('common.notSet')

  const now = new Date()
  const time = dateTimeFormat(TIME_OPTS).format(d)
  if (isSameDay(d, now)) return i18n.t('time.todayAt', { time })

  const date = dateTimeFormat(
    d.getFullYear() === now.getFullYear() ? DAY_MONTH_OPTS : DAY_MONTH_YEAR_OPTS,
  ).format(d)
  return i18n.t('time.dateAt', { date, time })
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
 * - within 24h   → fresh ("today, 14:32" / "yesterday, 14:32")
 * - 1–7 days     → stale ("3 days ago")
 * - > 7 days     → old   ("not updated for 8 days")
 * - null/invalid → old   ("not updated yet")
 */
export function getUpdateFreshness(iso: string | null | undefined): Freshness {
  const d = parse(iso)
  if (!d) return { level: 'old', label: i18n.t('freshness.never') }

  const now = new Date()
  const diffMs = now.getTime() - d.getTime()

  if (diffMs < DAY_MS) {
    const time = dateTimeFormat(TIME_OPTS).format(d)
    const key = isSameDay(d, now) ? 'freshness.today' : 'freshness.yesterday'
    return { level: 'fresh', label: i18n.t(key, { time }) }
  }

  const count = Math.floor(diffMs / DAY_MS)
  if (count <= 7) return { level: 'stale', label: i18n.t('freshness.daysAgo', { count }) }
  return { level: 'old', label: i18n.t('freshness.notUpdatedDays', { count }) }
}

/** Turn an unknown thrown value into a user-facing message. */
export function toErrorMessage(err: unknown): string {
  if (err instanceof Error) return err.message
  if (typeof err === 'string') return err
  return i18n.t('common.unexpectedError')
}
