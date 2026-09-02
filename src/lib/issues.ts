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
      throw new Error(
        `Не удалось подготовить фото: ${err instanceof Error ? err.message : 'ошибка'}`,
      )
    }

    photoPath = buildIssuePhotoPath(input.projectId, input.file.name)
    const { error: uploadError } = await supabase.storage
      .from(PHOTOS_BUCKET)
      .upload(photoPath, blob, { contentType: 'image/jpeg', upsert: false })
    if (uploadError) {
      throw new Error(`Не удалось загрузить фото: ${uploadError.message}`)
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

  if (photoPath) {
    const { error: cleanupError } = await supabase.storage
      .from(PHOTOS_BUCKET)
      .remove([photoPath])
    if (cleanupError) {
      throw new Error(
        `Замечание не сохранено (${dbError.message}). Загруженное фото осталось ` +
          `в хранилище: ${photoPath}. Сообщите администратору.`,
      )
    }
    throw new Error(
      `Замечание не сохранено (${dbError.message}). Загруженное фото удалено, ` +
        `повторите попытку.`,
    )
  }

  throw new Error(`Не удалось сохранить замечание: ${dbError.message}`)
}
