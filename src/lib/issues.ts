import i18n from '../i18n'
import { supabase } from './supabaseClient'
import { PHOTOS_BUCKET } from './storage'
import { resizeImageToJpeg } from './image'
import { sanitizeImageBaseName } from './photos'
import type { IssuePriority } from '../types'

export interface NewIssueInput {
  projectId: string
  title: string
  description: string
  priority: IssuePriority
  responsibleParty: string
  /** ISO date (yyyy-mm-dd) or null. */
  dueDate: string | null
  file: File | null
  createdBy: string
}

/**
 * Left edge of an issue card: red only for urgent (`high`), neutral otherwise,
 * so colour never hints at a level the form does not offer.
 */
export const issueBorder = (priority: IssuePriority) =>
  priority === 'high' ? 'border-l-red-500' : 'border-l-slate-300'

function buildIssuePhotoPath(projectId: string, originalName: string): string {
  return `${projectId}/issues/${Date.now()}-${sanitizeImageBaseName(originalName)}.jpg`
}

/**
 * Create an issue, optionally with one photo stored on `issues.photo_path`
 * (not the `photos` table). If the photo uploads but the row insert fails we
 * try to remove the orphaned file and say in the error whether that worked.
 */
export async function createIssue(input: NewIssueInput): Promise<void> {
  let photoPath: string | null = null

  if (input.file) {
    let blob: Blob
    try {
      ;({ blob } = await resizeImageToJpeg(input.file))
    } catch (err) {
      console.warn('issue photo resize failed:', err)
      throw new Error(i18n.t('issues.preparePhotoFailed'))
    }

    photoPath = buildIssuePhotoPath(input.projectId, input.file.name)
    const { error: uploadError } = await supabase.storage
      .from(PHOTOS_BUCKET)
      .upload(photoPath, blob, { contentType: 'image/jpeg', upsert: false })
    if (uploadError) {
      console.warn('issue photo upload failed:', uploadError)
      throw new Error(i18n.t('issues.uploadPhotoFailed'))
    }
  }

  const { error: dbError } = await supabase.from('issues').insert({
    project_id: input.projectId,
    title: input.title.trim(),
    description: input.description.trim() || null,
    photo_path: photoPath,
    priority: input.priority,
    responsible_party: input.responsibleParty.trim() || null,
    status: 'open',
    due_date: input.dueDate,
    created_by: input.createdBy,
  })

  if (!dbError) return

  // Technical details (server message, orphaned storage path) go to the
  // console for support; the person on site gets one plain sentence.
  console.warn('issue insert failed:', dbError)
  if (photoPath) {
    const { error: cleanupError } = await supabase.storage
      .from(PHOTOS_BUCKET)
      .remove([photoPath])
    if (cleanupError) console.warn('orphaned issue photo left in storage:', photoPath, cleanupError)
  }

  throw new Error(i18n.t('issues.saveFailed'))
}
