import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { resolvePhotoUrls } from '../lib/storage'
import { toErrorMessage } from '../lib/format'
import { withTimeout } from '../lib/withTimeout'

export interface FeedPhoto {
  id: string
  /** Signed URL (1h), or null if it could not be resolved. */
  url: string | null
  storagePath: string
  caption: string | null
  uploadedAt: string
  uploaderName: string | null
  stageName: string | null
}

interface PhotoRow {
  id: string
  storage_path: string
  caption: string | null
  uploaded_at: string
  uploaded_by: string | null
  project_stages: { stage_templates: { name: string } | null } | null
}

interface UsePhotosResult {
  photos: FeedPhoto[]
  loading: boolean
  error: string | null
  reload: () => void
}

/**
 * Photo feed for a project, newest first. `stageFilter` is a project_stages id,
 * or 'all'. Resolves uploader names and short-lived signed URLs (private bucket).
 */
export function usePhotos(
  projectId: string | undefined,
  stageFilter: string,
): UsePhotosResult {
  const [photos, setPhotos] = useState<FeedPhoto[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [nonce, setNonce] = useState(0)

  useEffect(() => {
    if (!projectId) return
    let active = true

    async function load(): Promise<FeedPhoto[]> {
      let query = supabase
        .from('photos')
        .select(
          'id, storage_path, caption, uploaded_at, uploaded_by, project_stages(stage_templates(name))',
        )
        .eq('project_id', projectId)
        .order('uploaded_at', { ascending: false })

      if (stageFilter !== 'all') query = query.eq('project_stage_id', stageFilter)

      const { data, error: qErr } = await query
      if (qErr) throw qErr

      const rows = (data ?? []) as unknown as PhotoRow[]
      const [names, urls] = await Promise.all([
        resolveUploaderNames(rows.map((r) => r.uploaded_by)),
        resolvePhotoUrls(rows.map((r) => r.storage_path)),
      ])

      return rows.map((r) => ({
        id: r.id,
        url: urls.get(r.storage_path) ?? null,
        storagePath: r.storage_path,
        caption: r.caption,
        uploadedAt: r.uploaded_at,
        uploaderName: r.uploaded_by ? (names.get(r.uploaded_by) ?? null) : null,
        stageName: r.project_stages?.stage_templates?.name ?? null,
      }))
    }

    // oxlint-disable-next-line react/set-state-in-effect
    setLoading(true)
    setError(null)
    withTimeout(load())
      .then((rows) => {
        if (active) setPhotos(rows)
      })
      .catch((err) => {
        if (!active) return
        setPhotos([])
        setError(toErrorMessage(err))
      })
      .finally(() => {
        if (active) setLoading(false)
      })

    return () => {
      active = false
    }
  }, [projectId, stageFilter, nonce])

  return { photos, loading, error, reload: () => setNonce((n) => n + 1) }
}

async function resolveUploaderNames(ids: (string | null)[]): Promise<Map<string, string>> {
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
