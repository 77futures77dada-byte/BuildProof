import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { toErrorMessage } from '../lib/format'
import { withTimeout } from '../lib/withTimeout'

export interface StageOption {
  /** project_stages.id */
  id: string
  name: string
  sortOrder: number
}

interface StageRow {
  id: string
  stage_templates: { name: string; sort_order: number } | null
}

interface UseStageOptionsResult {
  options: StageOption[]
  loading: boolean
  error: string | null
}

/**
 * The project's stages as `{ id, name }` for dropdowns (filters, photo/task
 * forms). `id` is the project_stages row id, ordered by template sort_order.
 */
export function useStageOptions(projectId: string | undefined): UseStageOptionsResult {
  const [options, setOptions] = useState<StageOption[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!projectId) return
    let active = true

    async function load(): Promise<StageOption[]> {
      const { data, error: qErr } = await supabase
        .from('project_stages')
        .select('id, stage_templates(name, sort_order)')
        .eq('project_id', projectId)
      if (qErr) throw qErr

      return ((data ?? []) as unknown as StageRow[])
        .map((row) => ({
          id: row.id,
          name: row.stage_templates?.name ?? 'Без названия',
          sortOrder: row.stage_templates?.sort_order ?? Number.MAX_SAFE_INTEGER,
        }))
        .sort((a, b) => a.sortOrder - b.sortOrder)
    }

    // oxlint-disable-next-line react/set-state-in-effect
    setLoading(true)
    setError(null)
    withTimeout(load())
      .then((rows) => {
        if (active) setOptions(rows)
      })
      .catch((err) => {
        if (!active) return
        setOptions([])
        setError(toErrorMessage(err))
      })
      .finally(() => {
        if (active) setLoading(false)
      })

    return () => {
      active = false
    }
  }, [projectId])

  return { options, loading, error }
}
