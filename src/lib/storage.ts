import { supabase } from './supabaseClient'

/**
 * Storage bucket holding project photos. `photos.storage_path` values are keys
 * within this bucket.
 *
 * TODO(storage): confirm the bucket name against the Supabase project once the
 * photo upload flow is built.
 */
export const PHOTOS_BUCKET = 'photos'

const SIGNED_URL_TTL_SECONDS = 60 * 60

/**
 * Resolve storage keys to temporary signed URLs.
 *
 * Photo previews are a nice-to-have on the overview screen, so this never
 * throws: if storage is unreachable or a key is missing, that path is simply
 * absent from the returned map and the UI shows a neutral placeholder tile.
 */
export async function resolvePhotoUrls(paths: string[]): Promise<Map<string, string>> {
  const urls = new Map<string, string>()
  if (paths.length === 0) return urls

  try {
    const { data, error } = await supabase.storage
      .from(PHOTOS_BUCKET)
      .createSignedUrls(paths, SIGNED_URL_TTL_SECONDS)
    if (error) throw error
    for (const entry of data ?? []) {
      if (entry.path && entry.signedUrl) urls.set(entry.path, entry.signedUrl)
    }
  } catch (err) {
    console.warn('Не удалось получить ссылки на фото:', err)
  }
  return urls
}
