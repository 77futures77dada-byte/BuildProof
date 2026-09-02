/** Client-side image downscale + re-encode before upload. */

export const PHOTO_MAX_EDGE = 1600
export const PHOTO_QUALITY = 0.8

export interface ResizedImage {
  blob: Blob
  width: number
  height: number
}

/**
 * Downscale so the longest edge is at most {@link PHOTO_MAX_EDGE}px and
 * re-encode as JPEG at {@link PHOTO_QUALITY}. Smaller images are not upscaled
 * but are still re-encoded (normalises format, drops EXIF).
 *
 * Throws if the file is not a decodable image.
 */
export async function resizeImageToJpeg(
  file: File,
  maxEdge = PHOTO_MAX_EDGE,
  quality = PHOTO_QUALITY,
): Promise<ResizedImage> {
  if (!file.type.startsWith('image/')) {
    throw new Error('Выбранный файл не является изображением.')
  }

  const source = await loadImage(file)
  const srcW = 'naturalWidth' in source ? source.naturalWidth : source.width
  const srcH = 'naturalHeight' in source ? source.naturalHeight : source.height

  const scale = Math.min(1, maxEdge / Math.max(srcW, srcH))
  const width = Math.max(1, Math.round(srcW * scale))
  const height = Math.max(1, Math.round(srcH * scale))

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Не удалось обработать изображение (canvas недоступен).')
  ctx.drawImage(source, 0, 0, width, height)
  if ('close' in source) source.close()

  const blob = await new Promise<Blob | null>((resolve) => {
    canvas.toBlob(resolve, 'image/jpeg', quality)
  })
  if (!blob) throw new Error('Не удалось сжать изображение.')

  return { blob, width, height }
}

async function loadImage(file: File): Promise<ImageBitmap | HTMLImageElement> {
  if (typeof createImageBitmap === 'function') {
    try {
      return await createImageBitmap(file, { imageOrientation: 'from-image' })
    } catch {
      // Safari < 17 and some formats: fall back to <img>.
    }
  }

  const url = URL.createObjectURL(file)
  try {
    return await new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image()
      img.onload = () => resolve(img)
      img.onerror = () => reject(new Error('Не удалось открыть изображение.'))
      img.src = url
    })
  } finally {
    URL.revokeObjectURL(url)
  }
}
