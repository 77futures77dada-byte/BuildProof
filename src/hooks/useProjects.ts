import { useCallback, useEffect, useState } from 'react'
import i18n from '../i18n'
import { supabase } from '../lib/supabaseClient'
import { toErrorMessage } from '../lib/format'
import { withTimeout } from '../lib/withTimeout'
import { useAuth } from './useAuth'
import type { Project } from '../types'

const PROJECT_COLUMNS = 'id, company_id, name, address, deadline, budget, status'

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
}

function latest(map: Map<string, string>, key: string, value: string | null | undefined) {
  if (!value) return
  const prev = map.get(key)
  if (!prev || value > prev) map.set(key, value)
}

/** Worker names per project. Never fails the list: an RLS gap only hides the name. */
async function fetchFirstWorkers(ids: string[]): Promise<Map<string, string>> {
  const result = new Map<string, string>()
  try {
    const { data: access, error: accessError } = await supabase
      .from('project_access')
      .select('project_id, user_id')
      .in('project_id', ids)
    if (accessError || !access?.length) return result
    const rows = access as { project_id: string; user_id: string }[]
    const { data: people, error: peopleError } = await supabase
      .from('profiles')
      .select('id, full_name, role')
      .in('id', [...new Set(rows.map((r) => r.user_id))])
      .eq('role', 'worker')
    if (peopleError || !people) return result
    const names = new Map<string, string>()
    for (const p of people as { id: string; full_name: string | null }[]) {
      const name = p.full_name?.trim()
      if (name) names.set(p.id, name)
    }
    for (const r of rows) {
      const name = names.get(r.user_id)
      const prev = result.get(r.project_id)
      if (name && (!prev || name.localeCompare(prev) < 0)) result.set(r.project_id, name)
    }
  } catch {
    // Names are decoration; the list still renders without them.
  }
  return result
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
          .order('name')
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

      const [stagesRes, issuesRes, historyRes, photosRes, workers] = await Promise.all([
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
          .select('changed_at, project_stages!inner(project_id)')
          .in('project_stages.project_id', ids),
        supabase.from('photos').select('project_id, uploaded_at').in('project_id', ids),
        fetchFirstWorkers(ids),
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

      const lastReport = new Map<string, string>()
      for (const row of (historyRes.data ?? []) as unknown as {
        changed_at: string
        project_stages: { project_id: string } | { project_id: string }[] | null
      }[]) {
        const stage = Array.isArray(row.project_stages) ? row.project_stages[0] : row.project_stages
        if (stage) latest(lastReport, stage.project_id, row.changed_at)
      }
      for (const row of (photosRes.data ?? []) as { project_id: string; uploaded_at: string }[]) {
        latest(lastReport, row.project_id, row.uploaded_at)
      }

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
          firstWorkerName: workers.get(p.id) ?? null,
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
