import { useCallback, useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { toErrorMessage } from '../lib/format'
import { withTimeout } from '../lib/withTimeout'
import type { TaskStatus } from '../types'

export interface TaskItem {
  id: string
  title: string
  status: TaskStatus
  deadline: string | null
  assignedTo: string | null
  assigneeName: string | null
  projectStageId: string | null
  stageName: string | null
}

/** Fields the UI can change on a task (camelCase; translated to columns here). */
export type TaskPatch = Partial<
  Pick<TaskItem, 'status' | 'deadline' | 'assignedTo' | 'assigneeName' | 'projectStageId' | 'stageName'>
>

interface TaskRow {
  id: string
  title: string
  status: TaskStatus
  deadline: string | null
  assigned_to: string | null
  project_stage_id: string | null
  project_stages: { stage_templates: { name: string } | null } | null
}

interface UseTasksResult {
  tasks: TaskItem[]
  loading: boolean
  error: string | null
  reload: () => void
  /** Optimistic update with rollback; rejects on failure. */
  updateTask: (id: string, patch: TaskPatch) => Promise<void>
}

/**
 * Project tasks. When `assigneeId` is given, only that person's tasks load
 * (worker's "мои задачи"); otherwise every task in the project.
 */
export function useTasks(
  projectId: string | undefined,
  assigneeId: string | undefined,
): UseTasksResult {
  const [tasks, setTasks] = useState<TaskItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [nonce, setNonce] = useState(0)
  const tasksRef = useRef<TaskItem[]>([])

  useEffect(() => {
    tasksRef.current = tasks
  }, [tasks])

  useEffect(() => {
    if (!projectId) return
    let active = true

    async function load(): Promise<TaskItem[]> {
      let query = supabase
        .from('tasks')
        .select(
          'id, title, status, deadline, assigned_to, project_stage_id, project_stages(stage_templates(name))',
        )
        .eq('project_id', projectId)
      if (assigneeId) query = query.eq('assigned_to', assigneeId)

      const { data, error: qErr } = await query
      if (qErr) throw qErr

      const rows = (data ?? []) as unknown as TaskRow[]
      const names = await resolveNames(rows.map((r) => r.assigned_to))

      return rows.map((r) => ({
        id: r.id,
        title: r.title,
        status: r.status,
        deadline: r.deadline,
        assignedTo: r.assigned_to,
        assigneeName: r.assigned_to ? (names.get(r.assigned_to) ?? null) : null,
        projectStageId: r.project_stage_id,
        stageName: r.project_stages?.stage_templates?.name ?? null,
      }))
    }

    // oxlint-disable-next-line react/set-state-in-effect
    setLoading(true)
    setError(null)
    withTimeout(load())
      .then((rows) => {
        if (active) setTasks(rows)
      })
      .catch((err) => {
        if (!active) return
        setTasks([])
        setError(toErrorMessage(err))
      })
      .finally(() => {
        if (active) setLoading(false)
      })

    return () => {
      active = false
    }
  }, [projectId, assigneeId, nonce])

  const updateTask = useCallback(async (id: string, patch: TaskPatch) => {
    const previous = tasksRef.current.find((t) => t.id === id)
    if (!previous) return

    setTasks((list) => list.map((t) => (t.id === id ? { ...t, ...patch } : t)))

    const columns: Record<string, unknown> = {}
    if ('status' in patch) columns.status = patch.status
    if ('deadline' in patch) columns.deadline = patch.deadline || null
    if ('assignedTo' in patch) columns.assigned_to = patch.assignedTo || null
    if ('projectStageId' in patch) columns.project_stage_id = patch.projectStageId || null

    const { error: updateError } = await supabase.from('tasks').update(columns).eq('id', id)
    if (updateError) {
      setTasks((list) => list.map((t) => (t.id === id ? previous : t)))
      throw updateError
    }
  }, [])

  return {
    tasks,
    loading,
    error,
    reload: () => setNonce((n) => n + 1),
    updateTask,
  }
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
