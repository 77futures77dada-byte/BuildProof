import { useCallback, useEffect, useState } from 'react'
import i18n from '../i18n'
import { supabase } from '../lib/supabaseClient'
import { toErrorMessage } from '../lib/format'
import { withTimeout } from '../lib/withTimeout'
import { useAuth } from './useAuth'
import type { Project } from '../types'

const PROJECT_COLUMNS = 'id, company_id, name, address, deadline, budget, status, created_at'

export interface DashboardProject extends Project {
  /** Mean of the project's stage progress, rounded. 0 when there are no stages. */
  overallPercent: number
  /** issues with status != 'resolved'. */
  activeIssueCount: number
  /**
   * Latest field report: max(stage_history.changed_at, photos.uploaded_at), or
   * null. Not project_stages.updated_at — stages are seeded at creation, which
   * would make a brand-new project look "reported today".
   */
  lastReportAt: string | null
  /** A worker with access, named in «ждём первый отчёт от …». Best effort. */
  firstWorkerName: string | null
  /** projects.created_at (null in old fixtures). */
  createdAt: string | null
  /** Latest stage change or photo by a `worker`. */
  lastWorkerReportAt: string | null
  /** Latest own mark of an owner / foreman, and who made it. */
  lastMarkAt: string | null
  lastMarkRole: 'gc' | 'foreman' | null
  /** Workers and foremen with access to the project (names). */
  peopleNames: string[]
  /** The current user's own latest report on this project (worker card). */
  myLastReportAt: string | null
}

interface PeopleInfo {
  first: Map<string, string>
  names: Map<string, string[]>
  roles: Map<string, string>
}

function latest(map: Map<string, string>, key: string, value: string | null | undefined) {
  if (!value) return
  const prev = map.get(key)
  if (!prev || value > prev) map.set(key, value)
}

/**
 * People per project (workers + foremen) and the role of every profile we can
 * see. Never fails the list: an RLS gap only hides names and roles.
 */
async function fetchPeople(ids: string[], changerIds: string[]): Promise<PeopleInfo> {
  const info: PeopleInfo = { first: new Map(), names: new Map(), roles: new Map() }
  try {
    const { data: access, error: accessError } = await supabase
      .from('project_access')
      .select('project_id, user_id')
      .in('project_id', ids)
    const rows = accessError || !access ? [] : (access as { project_id: string; user_id: string }[])
    const profileIds = [...new Set([...rows.map((r) => r.user_id), ...changerIds])]
    if (!profileIds.length) return info
    const { data: people, error: peopleError } = await supabase
      .from('profiles')
      .select('id, full_name, role')
      .in('id', profileIds)
    if (peopleError || !people) return info
    const byId = new Map<string, { name: string; role: string }>()
    for (const p of people as { id: string; full_name: string | null; role: string }[]) {
      info.roles.set(p.id, p.role)
      byId.set(p.id, { name: p.full_name?.trim() ?? '', role: p.role })
    }
    for (const r of rows) {
      const person = byId.get(r.user_id)
      if (!person?.name || (person.role !== 'worker' && person.role !== 'foreman')) continue
      const list = info.names.get(r.project_id) ?? []
      if (!list.includes(person.name)) list.push(person.name)
      info.names.set(r.project_id, list)
      const prev = info.first.get(r.project_id)
      if (person.role === 'worker' && (!prev || person.name.localeCompare(prev) < 0)) info.first.set(r.project_id, person.name)
    }
    for (const list of info.names.values()) list.sort((a, b) => a.localeCompare(b))
  } catch {
    // Names are decoration; the list still renders without them.
  }
  return info
}

interface UseProjectsResult {
  projects: DashboardProject[]
  loading: boolean
  error: string | null
  reload: () => void
}

/**
 * Loads the projects visible to the current user, each enriched with the
 * summary the dashboard card shows: overall %, open-issue count and the
 * last-activity timestamp.
 *
 * - `gc`: every project belonging to their company.
 * - everyone else: projects granted through `project_access`.
 *
 * RLS is expected to enforce the same boundaries server-side; the role check
 * here only picks the more efficient query shape.
 */
export function useProjects(): UseProjectsResult {
  const { user, profile } = useAuth()
  const [projects, setProjects] = useState<DashboardProject[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [nonce, setNonce] = useState(0)

  const reload = useCallback(() => setNonce((n) => n + 1), [])

  const userId = user?.id
  const role = profile?.role
  const companyId = profile?.company_id ?? null

  useEffect(() => {
    if (!userId || !role) return
    let active = true

    async function fetchBaseProjects(): Promise<Project[]> {
      if (role === 'gc') {
        if (!companyId) {
          throw new Error(i18n.t('common.noCompany'))
        }
        const { data, error: qErr } = await supabase
          .from('projects')
          .select(PROJECT_COLUMNS)
          .eq('company_id', companyId)
        if (qErr) throw qErr
        return (data ?? []) as Project[]
      }

      const { data, error: qErr } = await supabase
        .from('project_access')
        .select(`project:projects(${PROJECT_COLUMNS})`)
        .eq('user_id', userId)
      if (qErr) throw qErr
      const rows = (data ?? []) as unknown as { project: Project | null }[]
      return rows
        .map((r) => r.project)
        .filter((p): p is Project => p !== null)
        .sort((a, b) => a.name.localeCompare(b.name))
    }

    async function fetchProjects(): Promise<DashboardProject[]> {
      const base = await fetchBaseProjects()
      const ids = base.map((p) => p.id)
      if (ids.length === 0) return []

      const [stagesRes, issuesRes, historyRes, photosRes] = await Promise.all([
        supabase
          .from('project_stages')
          .select('project_id, progress_percent')
          .in('project_id', ids),
        supabase
          .from('issues')
          .select('project_id')
          .in('project_id', ids)
          .neq('status', 'resolved'),
        supabase
          .from('stage_history')
          .select('changed_at, changed_by, project_stages!inner(project_id)')
          .in('project_stages.project_id', ids),
        supabase.from('photos').select('project_id, uploaded_at, uploaded_by').in('project_id', ids),
      ])
      if (stagesRes.error) throw stagesRes.error
      if (issuesRes.error) throw issuesRes.error
      if (historyRes.error) throw historyRes.error
      if (photosRes.error) throw photosRes.error

      const agg = new Map<string, { sum: number; count: number }>()
      for (const row of (stagesRes.data ?? []) as { project_id: string; progress_percent: number }[]) {
        const e = agg.get(row.project_id) ?? { sum: 0, count: 0 }
        e.sum += row.progress_percent
        e.count += 1
        agg.set(row.project_id, e)
      }

      const historyRows = (historyRes.data ?? []) as unknown as {
        changed_at: string
        changed_by: string | null
        project_stages: { project_id: string } | { project_id: string }[] | null
      }[]
      const photoRows = (photosRes.data ?? []) as { project_id: string; uploaded_at: string; uploaded_by: string | null }[]
      const changers = [...historyRows.map((r) => r.changed_by), ...photoRows.map((r) => r.uploaded_by)]
        .filter((v): v is string => Boolean(v))
      const people = await fetchPeople(ids, [...new Set(changers)])

      const lastReport = new Map<string, string>()
      const lastWorker = new Map<string, string>()
      const lastMark = new Map<string, string>()
      const markRole = new Map<string, 'gc' | 'foreman'>()
      const mine = new Map<string, string>()
      const track = (projectId: string, at: string, by: string | null, isMark: boolean) => {
        latest(lastReport, projectId, at)
        if (by && by === userId) latest(mine, projectId, at)
        const role = by ? people.roles.get(by) : undefined
        if (role === 'gc' || role === 'foreman') {
          if (!isMark) return
          const prev = lastMark.get(projectId)
          if (!prev || at > prev) {
            lastMark.set(projectId, at)
            markRole.set(projectId, role)
          }
        } else {
          // worker or unknown author: counts as a field report
          latest(lastWorker, projectId, at)
        }
      }
      for (const row of historyRows) {
        const stage = Array.isArray(row.project_stages) ? row.project_stages[0] : row.project_stages
        if (stage) track(stage.project_id, row.changed_at, row.changed_by, true)
      }
      for (const row of photoRows) track(row.project_id, row.uploaded_at, row.uploaded_by, false)

      const issueCounts = new Map<string, number>()
      for (const row of (issuesRes.data ?? []) as { project_id: string }[]) {
        issueCounts.set(row.project_id, (issueCounts.get(row.project_id) ?? 0) + 1)
      }

      return base.map((p) => {
        const e = agg.get(p.id)
        return {
          ...p,
          overallPercent: e && e.count > 0 ? Math.round(e.sum / e.count) : 0,
          activeIssueCount: issueCounts.get(p.id) ?? 0,
          lastReportAt: lastReport.get(p.id) ?? null,
          firstWorkerName: people.first.get(p.id) ?? null,
          createdAt: (p as Project & { created_at?: string }).created_at ?? null,
          lastWorkerReportAt: lastWorker.get(p.id) ?? null,
          lastMarkAt: lastMark.get(p.id) ?? null,
          lastMarkRole: markRole.get(p.id) ?? null,
          peopleNames: people.names.get(p.id) ?? [],
          myLastReportAt: mine.get(p.id) ?? null,
        }
      })
    }

    // Entering the loading state as we kick off a request to an external
    // system (Supabase) is exactly what this effect is for.
    // oxlint-disable-next-line react/set-state-in-effect
    setLoading(true)
    setError(null)
    withTimeout(fetchProjects())
      .then((rows) => {
        if (!active) return
        setProjects(rows)
      })
      .catch((err) => {
        if (!active) return
        setProjects([])
        setError(toErrorMessage(err))
      })
      .finally(() => {
        if (active) setLoading(false)
      })

    return () => {
      active = false
    }
  }, [userId, role, companyId, nonce])

  return { projects, loading, error, reload }
}
