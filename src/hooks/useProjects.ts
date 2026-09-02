import { useCallback, useEffect, useState } from 'react'
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
  /** max(project_stages.updated_at), or null. Drives the freshness label. */
  lastReportAt: string | null
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
          throw new Error(
            'У вашего профиля не указана компания. Обратитесь к администратору.',
          )
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

      const [stagesRes, issuesRes] = await Promise.all([
        supabase
          .from('project_stages')
          .select('project_id, progress_percent, updated_at')
          .in('project_id', ids),
        supabase
          .from('issues')
          .select('project_id')
          .in('project_id', ids)
          .neq('status', 'resolved'),
      ])
      if (stagesRes.error) throw stagesRes.error
      if (issuesRes.error) throw issuesRes.error

      const agg = new Map<string, { sum: number; count: number; last: string | null }>()
      for (const row of (stagesRes.data ?? []) as {
        project_id: string
        progress_percent: number
        updated_at: string
      }[]) {
        const e = agg.get(row.project_id) ?? { sum: 0, count: 0, last: null }
        e.sum += row.progress_percent
        e.count += 1
        if (!e.last || row.updated_at > e.last) e.last = row.updated_at
        agg.set(row.project_id, e)
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
          lastReportAt: e?.last ?? null,
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
