import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { withTimeout } from '../lib/withTimeout'
import type { UserRole } from '../types'

export interface LastMark {
  changedAt: string
  name: string | null
  role: UserRole | null
}

/**
 * Latest `stage_history` row per stage of a project, with the author's name
 * and role (for «Отметил владелец / бригадир / Отмечено бригадой», residual
 * И4-М2). Errors are swallowed: the stage list still renders without meta.
 */
export function useLastMarks(projectId: string | undefined, refreshToken: number): Map<string, LastMark> {
  const [marks, setMarks] = useState<Map<string, LastMark>>(new Map())

  useEffect(() => {
    if (!projectId) return
    let active = true
    async function load(): Promise<Map<string, LastMark>> {
      const { data, error } = await supabase
        .from('stage_history')
        .select('project_stage_id, changed_by, changed_at, project_stages!inner(project_id)')
        .eq('project_stages.project_id', projectId)
        .order('changed_at', { ascending: false })
        .limit(200)
      if (error) throw error
      const rows = (data ?? []) as { project_stage_id: string; changed_by: string | null; changed_at: string }[]
      const latest = new Map<string, { changed_by: string | null; changed_at: string }>()
      for (const r of rows) if (!latest.has(r.project_stage_id)) latest.set(r.project_stage_id, r)
      const ids = [...new Set([...latest.values()].map((r) => r.changed_by).filter((v): v is string => !!v))]
      const people = new Map<string, { full_name: string | null; role: UserRole }>()
      if (ids.length) {
        const res = await supabase.from('profiles').select('id, full_name, role').in('id', ids)
        if (!res.error) for (const p of (res.data ?? []) as { id: string; full_name: string | null; role: UserRole }[]) people.set(p.id, p)
      }
      const out = new Map<string, LastMark>()
      for (const [stageId, r] of latest) {
        const p = r.changed_by ? people.get(r.changed_by) : undefined
        out.set(stageId, { changedAt: r.changed_at, name: p?.full_name ?? null, role: p?.role ?? null })
      }
      return out
    }
    withTimeout(load())
      .then((m) => { if (active) setMarks(m) })
      .catch(() => {})
    return () => { active = false }
  }, [projectId, refreshToken])

  return marks
}
