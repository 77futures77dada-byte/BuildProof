import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { toErrorMessage } from '../lib/format'
import type { UserRole } from '../types'

export interface ProjectMember {
  id: string
  name: string
  role: UserRole
}

/** Roles that can be assigned tasks. */
const ASSIGNABLE_ROLES: ReadonlySet<UserRole> = new Set(['gc', 'foreman', 'worker'])

interface UseProjectMembersResult {
  members: ProjectMember[]
  loading: boolean
  error: string | null
}

/**
 * People with access to the project who can be assigned work — used to populate
 * the "assignee" dropdown. Two queries (project_access → profiles) so it works
 * regardless of the FK wiring between them.
 */
export function useProjectMembers(projectId: string | undefined): UseProjectMembersResult {
  const [members, setMembers] = useState<ProjectMember[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!projectId) return
    let active = true

    async function load(): Promise<ProjectMember[]> {
      const { data: access, error: accessError } = await supabase
        .from('project_access')
        .select('user_id')
        .eq('project_id', projectId)
      if (accessError) throw accessError

      const ids = [...new Set((access ?? []).map((row) => row.user_id as string))]
      if (ids.length === 0) return []

      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, full_name, role')
        .in('id', ids)
      if (profilesError) throw profilesError

      return ((profiles ?? []) as { id: string; full_name: string | null; role: UserRole }[])
        .filter((p) => ASSIGNABLE_ROLES.has(p.role))
        .map((p) => ({ id: p.id, name: p.full_name ?? 'Без имени', role: p.role }))
        .sort((a, b) => a.name.localeCompare(b.name))
    }

    // oxlint-disable-next-line react/set-state-in-effect
    setLoading(true)
    setError(null)
    load()
      .then((rows) => {
        if (active) setMembers(rows)
      })
      .catch((err) => {
        if (!active) return
        setMembers([])
        setError(toErrorMessage(err))
      })
      .finally(() => {
        if (active) setLoading(false)
      })

    return () => {
      active = false
    }
  }, [projectId])

  return { members, loading, error }
}
