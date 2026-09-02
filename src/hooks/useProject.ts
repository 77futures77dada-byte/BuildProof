import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { toErrorMessage } from '../lib/format'
import { withTimeout } from '../lib/withTimeout'
import type { Project } from '../types'

interface UseProjectResult {
  project: Project | null
  loading: boolean
  error: string | null
  reload: () => void
}

/**
 * Loads a single project row. Used by ProjectLayout for the shared header;
 * screens that need related data (stages, photos, …) have their own hooks.
 */
export function useProject(projectId: string | undefined): UseProjectResult {
  const [project, setProject] = useState<Project | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [nonce, setNonce] = useState(0)

  useEffect(() => {
    if (!projectId) return
    let active = true

    async function load(): Promise<Project> {
      const { data, error: qErr } = await supabase
        .from('projects')
        .select('id, company_id, name, address, deadline, budget, status')
        .eq('id', projectId)
        .single()
      if (qErr) throw qErr
      return data as Project
    }

    // oxlint-disable-next-line react/set-state-in-effect
    setLoading(true)
    setError(null)
    withTimeout(load())
      .then((row) => {
        if (active) setProject(row)
      })
      .catch((err) => {
        if (!active) return
        setProject(null)
        setError(toErrorMessage(err))
      })
      .finally(() => {
        if (active) setLoading(false)
      })

    return () => {
      active = false
    }
  }, [projectId, nonce])

  return { project, loading, error, reload: () => setNonce((n) => n + 1) }
}
