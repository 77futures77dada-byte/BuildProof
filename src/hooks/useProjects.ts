import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { toErrorMessage } from '../lib/format'
import { useAuth } from './useAuth'
import type { Project } from '../types'

const PROJECT_COLUMNS = 'id, company_id, name, address, deadline, budget, status'

interface UseProjectsResult {
  projects: Project[]
  loading: boolean
  error: string | null
  reload: () => void
}

/**
 * Loads the projects visible to the current user.
 *
 * - `gc`: every project belonging to their company.
 * - everyone else: projects granted through `project_access`.
 *
 * RLS is expected to enforce the same boundaries server-side; the role check
 * here only picks the more efficient query shape.
 */
export function useProjects(): UseProjectsResult {
  const { user, profile } = useAuth()
  const [projects, setProjects] = useState<Project[]>([])
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

    async function fetchProjects(): Promise<Project[]> {
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

    // Entering the loading state as we kick off a request to an external
    // system (Supabase) is exactly what this effect is for.
    // oxlint-disable-next-line react/set-state-in-effect
    setLoading(true)
    setError(null)
    fetchProjects()
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
