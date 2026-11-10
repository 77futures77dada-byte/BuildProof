import i18n from '../i18n'
import { supabase } from './supabaseClient'
import { PHOTOS_BUCKET } from './storage'
import { resizeImageToJpeg } from './image'

/** ASCII-safe, length-capped base name for a storage key (no extension). */
export function sanitizeImageBaseName(originalName: string): string {
  const base = originalName
    .replace(/\.[^.]+$/, '')
    .normalize('NFKD')
    .replace(/[^\w.-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 60)
  return base || 'photo'
}

/** Build a stable storage key: `{project}/{stage}/{timestamp}-{name}.jpg`. */
export function buildStoragePath(
  projectId: string,
  projectStageId: string,
  originalName: string,
): string {
  return `${projectId}/${projectStageId}/${Date.now()}-${sanitizeImageBaseName(originalName)}.jpg`
}

export interface UploadPhotoInput {
  projectId: string
  projectStageId: string
  caption: string
  file: File
  uploadedBy: string
}

/** Which step failed — the caller phrases the message accordingly. */
export type PhotoUploadStage = 'resize' | 'storage' | 'db'

export class PhotoUploadError extends Error {
  step: PhotoUploadStage
  constructor(step: PhotoUploadStage, message: string) {
    super(message)
    this.name = 'PhotoUploadError'
    this.step = step
  }
}

/**
 * Two independent steps, each with its own error:
 *   1. resize on the client
 *   2. upload the file to storage
 *   3. insert the `photos` row
 *
 * If step 3 fails we try to delete the just-uploaded file so it doesn't linger
 * as an orphan; the error says explicitly whether that cleanup succeeded.
 */
export async function uploadProjectPhoto(input: UploadPhotoInput): Promise<void> {
  const { projectId, projectStageId, caption, file, uploadedBy } = input

  let blob: Blob
  try {
    ;({ blob } = await resizeImageToJpeg(file))
  } catch (err) {
    console.warn('photo resize failed:', err)
    throw new PhotoUploadError('resize', i18n.t('photos.prepareFailed'))
  }

  const path = buildStoragePath(projectId, projectStageId, file.name)

  const { error: storageError } = await supabase.storage
    .from(PHOTOS_BUCKET)
    .upload(path, blob, { contentType: 'image/jpeg', upsert: false })
  if (storageError) {
    console.warn('photo upload failed:', storageError)
    throw new PhotoUploadError('storage', i18n.t('photos.uploadFailed'))
  }

  const { error: dbError } = await supabase.from('photos').insert({
    project_id: projectId,
    project_stage_id: projectStageId,
    storage_path: path,
    caption: caption.trim() || null,
    uploaded_by: uploadedBy,
  })

  if (dbError) {
    // Details for support go to the console; the worker sees one plain line.
    console.warn('photo insert failed:', dbError)
    const { error: cleanupError } = await supabase.storage
      .from(PHOTOS_BUCKET)
      .remove([path])
    if (cleanupError) console.warn('orphaned photo left in storage:', path, cleanupError)
    throw new PhotoUploadError('db', i18n.t('photos.saveFailed'))
  }
}
