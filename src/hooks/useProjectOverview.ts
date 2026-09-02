import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { resolvePhotoUrls } from '../lib/storage'
import { toErrorMessage } from '../lib/format'
import { withTimeout } from '../lib/withTimeout'
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
  /** Number of stages at 100%. */
  completedStageCount: number
  /** max(project_stages.updated_at), or null when there are no stages. */
  lastUpdatedAt: string | null
  /** True if any stage of this project has at least one stage_history row. */
  hasStageHistory: boolean
  /**
   * Change in overall % over the last 7 days (percentage points), or null when
   * the project has no stage_history older than a week (too new to trend).
   */
  weeklyTrend: number | null
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

interface HistoryRow {
  project_stage_id: string
  new_percent: number
  changed_at: string
}

const WEEK_MS = 7 * 24 * 60 * 60 * 1000

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
      const [projectRes, stagesRes, photosRes, issuesRes, historyRes] = await Promise.all([
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
        // Every change to this project's stages — used for the "tracking not
        // started" check and the 7-day trend.
        supabase
          .from('stage_history')
          .select('project_stage_id, new_percent, changed_at, project_stages!inner(project_id)')
          .eq('project_stages.project_id', projectId)
          .order('changed_at', { ascending: true }),
      ])

      if (projectRes.error) throw projectRes.error
      if (stagesRes.error) throw stagesRes.error
      if (photosRes.error) throw photosRes.error
      if (issuesRes.error) throw issuesRes.error
      if (historyRes.error) throw historyRes.error

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

      const completedStageCount = stages.filter((s) => s.progressPercent >= 100).length

      const historyRows = (historyRes.data ?? []) as unknown as HistoryRow[]
      const hasStageHistory = historyRows.length > 0

      // 7-day trend: the % of each stage as of a week ago is the last recorded
      // value before that cut-off; a stage with no history that old counts as
      // unchanged (use its current value).
      const cutoff = Date.now() - WEEK_MS
      const percentThen = new Map<string, number>()
      let hasHistoryBeforeCutoff = false
      for (const row of historyRows) {
        if (new Date(row.changed_at).getTime() < cutoff) {
          percentThen.set(row.project_stage_id, row.new_percent)
          hasHistoryBeforeCutoff = true
        }
      }

      let weeklyTrend: number | null = null
      if (hasHistoryBeforeCutoff && stages.length > 0) {
        const overallThen = Math.round(
          stages.reduce((sum, s) => sum + (percentThen.get(s.id) ?? s.progressPercent), 0) /
            stages.length,
        )
        weeklyTrend = overallPercent - overallThen
      }

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
        completedStageCount,
        lastUpdatedAt,
        hasStageHistory,
        weeklyTrend,
        photos,
        activeIssues,
      }
    }

    // oxlint-disable-next-line react/set-state-in-effect
    setLoading(true)
    setError(null)
    withTimeout(load())
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
