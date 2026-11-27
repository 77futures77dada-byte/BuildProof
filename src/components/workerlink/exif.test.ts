import { describe, expect, it } from 'vitest'
import { parseExifDate, takenAtFromJpeg } from './exif'
import { compressPhotos, fitsLimits, MAX_PHOTO_BYTES, PhotosTooLargeError } from './photos'

/** Minimal JPEG: SOI, APP1 Exif (little endian) with IFD0 → ExifIFD → DateTimeOriginal (+ optional offset). */
function jpeg(date: string, offset?: string): DataView {
  const b: number[] = []
  const u16 = (n: number) => { b.push(n & 0xff, (n >> 8) & 0xff) }
  const u32 = (n: number) => { u16(n & 0xffff); u16(n >>> 16) }
  b.push(0x49, 0x49); u16(42); u32(8)
  // IFD0 at 8: one entry, the Exif IFD pointer → 26
  u16(1); u16(0x8769); u16(4); u32(1); u32(26); u32(0)
  const n = offset ? 2 : 1
  u16(n)
  const dataAt = 26 + 2 + n * 12 + 4
  u16(0x9003); u16(2); u32(20); u32(dataAt)
  if (offset) { u16(0x9011); u16(2); u32(7); u32(dataAt + 20) }
  u32(0)
  for (const c of `${date}\0`) b.push(c.charCodeAt(0))
  if (offset) for (const c of `${offset}\0`) b.push(c.charCodeAt(0))
  const app1 = [...'Exif'].map((c) => c.charCodeAt(0)).concat([0, 0], b)
  const size = app1.length + 2
  const all = [0xff, 0xd8, 0xff, 0xe1, size >> 8, size & 0xff, ...app1, 0xff, 0xd9]
  return new DataView(new Uint8Array(all).buffer)
}

describe('EXIF DateTimeOriginal', () => {
  it('reads the date with an offset as an exact instant', () => {
    expect(takenAtFromJpeg(jpeg('2026:11:27 09:15:00', '+02:00'))).toBe('2026-11-27T07:15:00.000Z')
  })
  it('without an offset reads local time', () => {
    expect(takenAtFromJpeg(jpeg('2026:11:27 09:15:00'))).toBe(new Date(2026, 10, 27, 9, 15, 0).toISOString())
  })
  it('null for non-JPEG, no EXIF or a broken date', () => {
    expect(takenAtFromJpeg(new DataView(new Uint8Array([0x89, 0x50, 0x4e, 0x47]).buffer))).toBeNull()
    expect(takenAtFromJpeg(new DataView(new Uint8Array([0xff, 0xd8, 0xff, 0xda, 0, 2]).buffer))).toBeNull()
    expect(parseExifDate('0000:00:00 00:00:00', null)).toBeNull()
    expect(parseExifDate(null, null)).toBeNull()
  })
})

describe('photo limits', () => {
  it('1–5 photos, ≤ 2 MiB each, ≤ 3 MiB total', () => {
    expect(fitsLimits([1e6, 1e6])).toBe(true)
    expect(fitsLimits([])).toBe(false)
    expect(fitsLimits([MAX_PHOTO_BYTES + 1])).toBe(false)
    expect(fitsLimits([1.6e6, 1.6e6])).toBe(false)
    expect(fitsLimits([1, 1, 1, 1, 1, 1])).toBe(false)
  })
  it('steps compression down until the set fits, else throws', async () => {
    const files = [new File(['a'], 'a.jpg'), new File(['b'], 'b.jpg')]
    const steps: number[] = []
    const out = await compressPhotos(files, async (_f, edge) => { steps.push(edge); return new Blob([new Uint8Array(edge >= 1280 ? 2e6 : 1e6)]) })
    expect(out).toHaveLength(2)
    expect(steps).toEqual([1600, 1600, 1280, 1280, 1024, 1024])
    await expect(compressPhotos(files, async () => new Blob([new Uint8Array(3e6)]))).rejects.toBeInstanceOf(PhotosTooLargeError)
  })
})
