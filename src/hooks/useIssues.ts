import { useCallback, useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { resolvePhotoUrls } from '../lib/storage'
import { toErrorMessage } from '../lib/format'
import { withTimeout } from '../lib/withTimeout'
import type { IssuePriority, IssueStatus } from '../types'

export interface IssueItem {
  id: string
  title: string
  description: string | null
  photoPath: string | null
  photoUrl: string | null
  priority: IssuePriority
  responsibleParty: string | null
  status: IssueStatus
  dueDate: string | null
}

interface IssueRow {
  id: string
  title: string
  description: string | null
  photo_path: string | null
  priority: IssuePriority
  responsible_party: string | null
  status: IssueStatus
  due_date: string | null
}

interface UseIssuesResult {
  issues: IssueItem[]
  loading: boolean
  error: string | null
  reload: () => void
  /** Optimistic status change with rollback; rejects on failure. */
  updateStatus: (id: string, status: IssueStatus) => Promise<void>
}

export function useIssues(projectId: string | undefined): UseIssuesResult {
  const [issues, setIssues] = useState<IssueItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [nonce, setNonce] = useState(0)
  const issuesRef = useRef<IssueItem[]>([])

  const reload = useCallback(() => setNonce((n) => n + 1), [])

  useEffect(() => {
    issuesRef.current = issues
  }, [issues])

  useEffect(() => {
    if (!projectId) return
    let active = true

    async function fetchIssues(): Promise<IssueItem[]> {
      const { data, error: qErr } = await supabase
        .from('issues')
        .select(
          'id, title, description, photo_path, priority, responsible_party, status, due_date',
        )
        .eq('project_id', projectId)
      if (qErr) throw qErr

      const rows = (data ?? []) as IssueRow[]
      const urls = await resolvePhotoUrls(
        rows.map((r) => r.photo_path).filter((p): p is string => p !== null),
      )

      return rows.map((r) => ({
        id: r.id,
        title: r.title,
        description: r.description,
        photoPath: r.photo_path,
        photoUrl: r.photo_path ? (urls.get(r.photo_path) ?? null) : null,
        priority: r.priority,
        responsibleParty: r.responsible_party,
        status: r.status,
        dueDate: r.due_date,
      }))
    }

    // Entering the loading state as we kick off a request to an external
    // system (Supabase) is exactly what this effect is for.
    // oxlint-disable-next-line react/set-state-in-effect
    setLoading(true)
    setError(null)
    withTimeout(fetchIssues())
      .then((rows) => {
        if (active) setIssues(rows)
      })
      .catch((err) => {
        if (!active) return
        setIssues([])
        setError(toErrorMessage(err))
      })
      .finally(() => {
        if (active) setLoading(false)
      })

    return () => {
      active = false
    }
  }, [projectId, nonce])

  const updateStatus = useCallback(async (id: string, status: IssueStatus) => {
    const previous = issuesRef.current.find((i) => i.id === id)
    if (!previous) return

    setIssues((list) => list.map((i) => (i.id === id ? { ...i, status } : i)))

    const { error: updateError } = await supabase
      .from('issues')
      .update({ status })
      .eq('id', id)
    if (updateError) {
      setIssues((list) => list.map((i) => (i.id === id ? previous : i)))
      throw updateError
    }
  }, [])

  return { issues, loading, error, reload, updateStatus }
}
