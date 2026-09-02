import { useCallback, useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { toErrorMessage } from '../lib/format'
import { withTimeout } from '../lib/withTimeout'
import type { UserRole } from '../types'

export interface AccessRow {
  userId: string
  name: string
  role: UserRole
  hasAccess: boolean
}

interface UseProjectAccessSettingsResult {
  rows: AccessRow[]
  loading: boolean
  error: string | null
  reload: () => void
  /** Optimistic insert/delete in project_access with rollback; rejects on failure. */
  toggleAccess: (userId: string, next: boolean) => Promise<void>
}

/**
 * Company users (except `excludeUserId`, normally the current gc) paired with
 * whether they have a `project_access` row for this project.
 */
export function useProjectAccessSettings(
  projectId: string | undefined,
  companyId: string | undefined,
  excludeUserId: string | undefined,
): UseProjectAccessSettingsResult {
  const [rows, setRows] = useState<AccessRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [nonce, setNonce] = useState(0)
  const rowsRef = useRef<AccessRow[]>([])

  const reload = useCallback(() => setNonce((n) => n + 1), [])

  useEffect(() => {
    rowsRef.current = rows
  }, [rows])

  useEffect(() => {
    if (!projectId || !companyId) return
    let active = true

    async function fetchRows(): Promise<AccessRow[]> {
      const [profilesRes, accessRes] = await Promise.all([
        supabase.from('profiles').select('id, full_name, role').eq('company_id', companyId),
        supabase.from('project_access').select('user_id').eq('project_id', projectId),
      ])
      if (profilesRes.error) throw profilesRes.error
      if (accessRes.error) throw accessRes.error

      const granted = new Set((accessRes.data ?? []).map((r) => r.user_id as string))

      return ((profilesRes.data ?? []) as {
        id: string
        full_name: string | null
        role: UserRole
      }[])
        .filter((p) => p.id !== excludeUserId)
        .map((p) => ({
          userId: p.id,
          name: p.full_name ?? 'Без имени',
          role: p.role,
          hasAccess: granted.has(p.id),
        }))
        .sort((a, b) => a.name.localeCompare(b.name))
    }

    // Entering the loading state as we kick off a request to an external
    // system (Supabase) is exactly what this effect is for.
    // oxlint-disable-next-line react/set-state-in-effect
    setLoading(true)
    setError(null)
    withTimeout(fetchRows())
      .then((next) => {
        if (active) setRows(next)
      })
      .catch((err) => {
        if (!active) return
        setRows([])
        setError(toErrorMessage(err))
      })
      .finally(() => {
        if (active) setLoading(false)
      })

    return () => {
      active = false
    }
  }, [projectId, companyId, excludeUserId, nonce])

  const toggleAccess = useCallback(
    async (userId: string, next: boolean) => {
      if (!projectId) return
      const previous = rowsRef.current.find((r) => r.userId === userId)
      if (!previous) return

      setRows((list) =>
        list.map((r) => (r.userId === userId ? { ...r, hasAccess: next } : r)),
      )

      const { error: writeError } = next
        ? await supabase.from('project_access').insert({ project_id: projectId, user_id: userId })
        : await supabase
            .from('project_access')
            .delete()
            .eq('project_id', projectId)
            .eq('user_id', userId)

      if (writeError) {
        setRows((list) =>
          list.map((r) => (r.userId === userId ? previous : r)),
        )
        throw writeError
      }
    },
    [projectId],
  )

  return { rows, loading, error, reload, toggleAccess }
}
