import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { toErrorMessage } from '../lib/format'

export interface StageHistoryEntry {
  id: string
  oldPercent: number
  newPercent: number
  changedByName: string | null
  changedAt: string
}

interface HistoryRow {
  id: string
  old_percent: number
  new_percent: number
  changed_by: string | null
  changed_at: string
}

interface UseStageHistoryResult {
  entries: StageHistoryEntry[]
  loading: boolean
  error: string | null
}

const HISTORY_LIMIT = 5

/**
 * Last {@link HISTORY_LIMIT} changes for one stage. Fetched only when `enabled`
 * (i.e. the history panel is open); refetched whenever `refreshToken` changes.
 */
export function useStageHistory(
  projectStageId: string,
  enabled: boolean,
  refreshToken: number,
): UseStageHistoryResult {
  const [entries, setEntries] = useState<StageHistoryEntry[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!enabled) return
    let active = true

    async function load(): Promise<StageHistoryEntry[]> {
      const { data, error: qErr } = await supabase
        .from('stage_history')
        .select('id, old_percent, new_percent, changed_by, changed_at')
        .eq('project_stage_id', projectStageId)
        .order('changed_at', { ascending: false })
        .limit(HISTORY_LIMIT)
      if (qErr) throw qErr

      const rows = (data ?? []) as HistoryRow[]
      const names = await resolveNames(rows.map((r) => r.changed_by))

      return rows.map((r) => ({
        id: r.id,
        oldPercent: r.old_percent,
        newPercent: r.new_percent,
        changedByName: r.changed_by ? (names.get(r.changed_by) ?? null) : null,
        changedAt: r.changed_at,
      }))
    }

    // oxlint-disable-next-line react/set-state-in-effect
    setLoading(true)
    setError(null)
    load()
      .then((rows) => {
        if (active) setEntries(rows)
      })
      .catch((err) => {
        if (!active) return
        setEntries([])
        setError(toErrorMessage(err))
      })
      .finally(() => {
        if (active) setLoading(false)
      })

    return () => {
      active = false
    }
  }, [projectStageId, enabled, refreshToken])

  return { entries, loading, error }
}

async function resolveNames(ids: (string | null)[]): Promise<Map<string, string>> {
  const unique = [...new Set(ids.filter((id): id is string => id !== null))]
  const names = new Map<string, string>()
  if (unique.length === 0) return names

  const { data, error } = await supabase
    .from('profiles')
    .select('id, full_name')
    .in('id', unique)
  if (error) throw error

  for (const row of (data ?? []) as { id: string; full_name: string | null }[]) {
    if (row.full_name) names.set(row.id, row.full_name)
  }
  return names
}
