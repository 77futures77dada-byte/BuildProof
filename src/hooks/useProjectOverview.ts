import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { resolvePhotoUrls } from '../lib/storage'
import { toErrorMessage } from '../lib/format'
import type { IssuePriority, IssueStatus, Project } from '../types'

export interface StageProgress {
  /** project_stages.id */
  id: string
  name: string
  sortOrder: number
  progressPercent: number
}

export interface OverviewPhoto {
  id: string
  caption: string | null
  uploadedAt: string
  /** Signed URL, or null when it could not be resolved. */
  url: string | null
}

export interface ActiveIssue {
  id: string
  title: string
  priority: IssuePriority
  status: IssueStatus
  dueDate: string | null
}

export interface ProjectOverview {
  project: Project
  /** Mean of every stage's progress_percent, rounded to a whole number. */
  overallPercent: number
  stages: StageProgress[]
  /** max(project_stages.updated_at), or null when there are no stages. */
  lastUpdatedAt: string | null
  photos: OverviewPhoto[]
  activeIssues: ActiveIssue[]
}

interface UseProjectOverviewResult {
  data: ProjectOverview | null
  loading: boolean
  error: string | null
  reload: () => void
}

const PRIORITY_RANK: Record<IssuePriority, number> = { high: 0, medium: 1, low: 2 }

interface StageRow {
  id: string
  progress_percent: number
  updated_at: string
  stage_templates: { name: string; sort_order: number } | null
}

interface PhotoRow {
  id: string
  storage_path: string
  caption: string | null
  uploaded_at: string
}

interface IssueRow {
  id: string
  title: string
  priority: IssuePriority
  status: IssueStatus
  due_date: string | null
}

/**
 * Loads everything the customer overview screen (/project/:id) needs:
 * the project, per-stage progress, the 6 newest photos and the open issues.
 * Same loading/error/reload contract as useProjects.
 */
export function useProjectOverview(projectId: string | undefined): UseProjectOverviewResult {
  const [data, setData] = useState<ProjectOverview | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [nonce, setNonce] = useState(0)

  useEffect(() => {
    if (!projectId) return
    let active = true

    async function load(): Promise<ProjectOverview> {
      const [projectRes, stagesRes, photosRes, issuesRes] = await Promise.all([
        supabase
          .from('projects')
          .select('id, company_id, name, address, deadline, budget, status')
          .eq('id', projectId)
          .single(),
        supabase
          .from('project_stages')
          .select('id, progress_percent, updated_at, stage_templates(name, sort_order)')
          .eq('project_id', projectId),
        supabase
          .from('photos')
          .select('id, storage_path, caption, uploaded_at')
          .eq('project_id', projectId)
          .order('uploaded_at', { ascending: false })
          .limit(6),
        supabase
          .from('issues')
          .select('id, title, priority, status, due_date')
          .eq('project_id', projectId)
          .neq('status', 'resolved'),
      ])

      if (projectRes.error) throw projectRes.error
      if (stagesRes.error) throw stagesRes.error
      if (photosRes.error) throw photosRes.error
      if (issuesRes.error) throw issuesRes.error

      const stageRows = (stagesRes.data ?? []) as unknown as StageRow[]
      const stages: StageProgress[] = stageRows
        .map((row) => ({
          id: row.id,
          name: row.stage_templates?.name ?? 'Без названия',
          sortOrder: row.stage_templates?.sort_order ?? Number.MAX_SAFE_INTEGER,
          progressPercent: row.progress_percent,
        }))
        .sort((a, b) => a.sortOrder - b.sortOrder)

      const overallPercent =
        stages.length === 0
          ? 0
          : Math.round(
              stages.reduce((sum, s) => sum + s.progressPercent, 0) / stages.length,
            )

      const lastUpdatedAt =
        stageRows.length === 0
          ? null
          : stageRows.reduce(
              (max, row) => (row.updated_at > max ? row.updated_at : max),
              stageRows[0].updated_at,
            )

      const photoRows = (photosRes.data ?? []) as PhotoRow[]
      const signedUrls = await resolvePhotoUrls(photoRows.map((p) => p.storage_path))
      const photos: OverviewPhoto[] = photoRows.map((p) => ({
        id: p.id,
        caption: p.caption,
        uploadedAt: p.uploaded_at,
        url: signedUrls.get(p.storage_path) ?? null,
      }))

      const activeIssues: ActiveIssue[] = ((issuesRes.data ?? []) as IssueRow[])
        .map((row) => ({
          id: row.id,
          title: row.title,
          priority: row.priority,
          status: row.status,
          dueDate: row.due_date,
        }))
        .sort((a, b) => {
          const byPriority = PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority]
          if (byPriority !== 0) return byPriority
          // Earlier due dates first; issues without a date go last.
          if (a.dueDate && b.dueDate) return a.dueDate.localeCompare(b.dueDate)
          if (a.dueDate) return -1
          if (b.dueDate) return 1
          return 0
        })

      return {
        project: projectRes.data as Project,
        overallPercent,
        stages,
        lastUpdatedAt,
        photos,
        activeIssues,
      }
    }

    // oxlint-disable-next-line react/set-state-in-effect
    setLoading(true)
    setError(null)
    load()
      .then((result) => {
        if (active) setData(result)
      })
      .catch((err) => {
        if (!active) return
        setData(null)
        setError(toErrorMessage(err))
      })
      .finally(() => {
        if (active) setLoading(false)
      })

    return () => {
      active = false
    }
  }, [projectId, nonce])

  return { data, loading, error, reload: () => setNonce((n) => n + 1) }
}
