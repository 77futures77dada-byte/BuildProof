import { useCallback, useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { updateStageProgress } from '../lib/stages'
import { toErrorMessage } from '../lib/format'

export interface EditableStage {
  /** project_stages.id */
  id: string
  name: string
  sortOrder: number
  progressPercent: number
}

interface StageRow {
  id: string
  progress_percent: number
  stage_templates: { name: string; sort_order: number } | null
}

interface UseProjectStagesResult {
  stages: EditableStage[]
  loading: boolean
  error: string | null
  reload: () => void
  /**
   * Persist a new percent for one stage: optimistically updates local state,
   * calls the RPC, and rolls back if it fails (rejecting so the caller can
   * surface the error). Increments `historyToken` on success.
   */
  commitPercent: (stageId: string, newPercent: number) => Promise<void>
  /** Bumped after every successful commit so open history lists refetch. */
  historyToken: number
}

export function useProjectStages(projectId: string | undefined): UseProjectStagesResult {
  const [stages, setStages] = useState<EditableStage[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [nonce, setNonce] = useState(0)
  const [historyToken, setHistoryToken] = useState(0)

  // Last server-confirmed percents, for rollback on a failed commit.
  const confirmed = useRef<Map<string, number>>(new Map())

  useEffect(() => {
    if (!projectId) return
    let active = true

    async function load(): Promise<EditableStage[]> {
      const { data, error: qErr } = await supabase
        .from('project_stages')
        .select('id, progress_percent, stage_templates(name, sort_order)')
        .eq('project_id', projectId)
      if (qErr) throw qErr

      return ((data ?? []) as unknown as StageRow[])
        .map((row) => ({
          id: row.id,
          name: row.stage_templates?.name ?? 'Без названия',
          sortOrder: row.stage_templates?.sort_order ?? Number.MAX_SAFE_INTEGER,
          progressPercent: row.progress_percent,
        }))
        .sort((a, b) => a.sortOrder - b.sortOrder)
    }

    // oxlint-disable-next-line react/set-state-in-effect
    setLoading(true)
    setError(null)
    load()
      .then((rows) => {
        if (!active) return
        confirmed.current = new Map(rows.map((r) => [r.id, r.progressPercent]))
        setStages(rows)
      })
      .catch((err) => {
        if (!active) return
        setStages([])
        setError(toErrorMessage(err))
      })
      .finally(() => {
        if (active) setLoading(false)
      })

    return () => {
      active = false
    }
  }, [projectId, nonce])

  const commitPercent = useCallback(async (stageId: string, newPercent: number) => {
    const previous = confirmed.current.get(stageId) ?? 0

    setStages((prev) =>
      prev.map((s) => (s.id === stageId ? { ...s, progressPercent: newPercent } : s)),
    )

    try {
      await updateStageProgress(stageId, newPercent)
      confirmed.current.set(stageId, newPercent)
      setHistoryToken((t) => t + 1)
    } catch (err) {
      confirmed.current.set(stageId, previous)
      setStages((prev) =>
        prev.map((s) => (s.id === stageId ? { ...s, progressPercent: previous } : s)),
      )
      throw err
    }
  }, [])

  return {
    stages,
    loading,
    error,
    reload: () => setNonce((n) => n + 1),
    commitPercent,
    historyToken,
  }
}
