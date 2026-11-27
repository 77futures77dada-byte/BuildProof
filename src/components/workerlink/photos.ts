/** Worker-link submit limits (docs/contracts/worker-links.md). */
export const MAX_PHOTOS = 5
export const MAX_PHOTO_BYTES = 2 * 1024 * 1024
/**
 * The API allows 3 MiB total, but base64 of 3 MiB is 4.19 MB and the Vercel
 * request body limit is 4.5 MB; keep a margin for JSON (critic r1 4.5).
 */
export const MAX_TOTAL_BYTES = Math.floor(2.8 * 1024 * 1024)

/** Compression steps, tried in order until every photo and the total fit. */
export const COMPRESS_STEPS: readonly { edge: number; quality: number }[] = [
  { edge: 1600, quality: 0.8 },
  { edge: 1280, quality: 0.72 },
  { edge: 1024, quality: 0.65 },
  { edge: 800, quality: 0.6 },
  { edge: 640, quality: 0.5 },
]

export function fitsLimits(sizes: number[]): boolean {
  return sizes.length >= 1 && sizes.length <= MAX_PHOTOS
    && sizes.every((s) => s > 0 && s <= MAX_PHOTO_BYTES)
    && sizes.reduce((a, b) => a + b, 0) <= MAX_TOTAL_BYTES
}

export class PhotosTooLargeError extends Error {
  constructor() { super('photos_too_large'); this.name = 'PhotosTooLargeError' }
}

/**
 * Compress the originals to JPEG, stepping down until the set fits 2 MiB each
 * and 3 MiB total. Throws PhotosTooLargeError if even the last step does not fit.
 */
export async function compressPhotos(
  files: File[],
  resize: (f: File, edge: number, quality: number) => Promise<Blob> = async (f, e, q) => (await (await import('../../lib/image')).resizeImageToJpeg(f, e, q)).blob,
  /** «Готовим фото N из M» (1-based), called before each photo. */
  onProgress?: (n: number, total: number) => void,
): Promise<Blob[]> {
  for (const step of COMPRESS_STEPS) {
    const out: Blob[] = []
    for (const [i, f] of files.entries()) {
      onProgress?.(i + 1, files.length)
      out.push(await resize(f, step.edge, step.quality))
    }
    if (fitsLimits(out.map((b) => b.size))) return out
  }
  throw new PhotosTooLargeError()
}
