import type { TFunction } from 'i18next'
import type { ProjectStatus } from '../types'
import type { StatusKind } from '../components/ui/statusKinds'

/** `VITE_EMAIL_GATE_OPEN` (03 §0.2 `gate-open`); one source of truth in emailGate.ts. */
export { isEmailGateOpen as isGateOpen } from './emailGate'
import { isEmailGateOpen as isGateOpen } from './emailGate'

const DAY_MS = 24 * 60 * 60 * 1000
const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()

/** Whole calendar days since `iso`; null when missing/invalid. */
export function daysSince(iso: string | null | undefined, now = new Date()): number | null {
  if (!iso) return null
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return null
  return Math.max(0, Math.round((startOfDay(now) - startOfDay(d)) / DAY_MS))
}

/** Freshness scale of the brief (В7): today / 1–2 / 3–6 / 7+. A shape only from 3 days on. */
export const STALE_DAYS = 3

export type MarkerRole = 'gc' | 'foreman'

export interface FreshnessInput {
  status: ProjectStatus
  /** Latest worker report (stage change or photo by a `worker`). */
  lastWorkerReportAt: string | null
  /** Latest own mark of an owner / foreman (`update_stage_progress`). */
  lastMarkAt: string | null
  lastMarkRole: MarkerRole | null
  /** Workers / foremen with access to the project. */
  peopleNames: string[]
  createdAt: string | null
}

export interface FreshnessView {
  icon?: StatusKind
  label: string
}

/** Latest activity: worker report or own mark, whichever is later (О34-1). */
export function lastActivityAt(input: FreshnessInput): string | null {
  const { lastWorkerReportAt: r, lastMarkAt: m } = input
  if (r && m) return r > m ? r : m
  return r ?? m
}

/**
 * Chip of `ProjectCard` / overview state card (03 §4.1). Pause/completion replace
 * freshness; no «Пришёл отчёт» chip until K35 (residual М4-6).
 */
export interface FreshnessOptions {
  gateOpen?: boolean
  now?: Date
  /** Date formatter (`formatDate` in the app; kept out of this module so it stays DOM-free). */
  fmt?: (iso: string) => string
}

export function freshnessView(input: FreshnessInput, t: TFunction, opts: FreshnessOptions = {}): FreshnessView {
  const { gateOpen = isGateOpen(), now = new Date(), fmt = (iso: string) => iso.slice(0, 10) } = opts
  if (input.status === 'paused') return { icon: 'paused', label: t('projectStatus.paused') }
  if (input.status === 'completed') return { label: t('projectStatus.completed') }

  if (input.lastWorkerReportAt) {
    const days = daysSince(lastActivityAt(input), now) ?? 0
    if (days === 0) return { label: t('reportStatus.today') }
    if (days === 1) return { label: t('reportStatus.yesterday') }
    return { icon: days >= STALE_DAYS ? 'stale' : undefined, label: t('reportStatus.late', { count: days }) }
  }
  if (input.lastMarkAt) {
    const key = input.lastMarkRole === 'foreman' ? 'reportStatus.markedByForeman' : 'reportStatus.markedByOwner'
    const days = daysSince(input.lastMarkAt, now) ?? 0
    return { icon: days >= STALE_DAYS ? 'stale' : undefined, label: t(key, { date: fmt(input.lastMarkAt) }) }
  }
  if (input.peopleNames.length > 0) {
    return { icon: 'noreports', label: t('reportStatus.noneWaiting', { names: input.peopleNames.join(', ') }) }
  }
  if (!gateOpen) return { label: t('reportStatus.noMarks') }
  const age = daysSince(input.createdAt, now) ?? 0
  return age >= STALE_DAYS
    ? { icon: 'noreports', label: t('reportStatus.noneDays', { count: age }) }
    : { label: t('reportStatus.none') }
}

/** Sort key for «worse freshness on top»: days since the last activity (or creation). */
export function staleness(input: FreshnessInput, now = new Date()): number {
  return daysSince(lastActivityAt(input) ?? input.createdAt, now) ?? 0
}
