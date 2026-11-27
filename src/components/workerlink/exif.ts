/**
 * EXIF DateTimeOriginal from a JPEG, read before compression (compression drops
 * EXIF). Only the first 128 KiB are read. Returns ISO-8601 or null: no EXIF,
 * not a JPEG, or a malformed date. Without OffsetTimeOriginal the date is the
 * camera's local time, read as this device's local time.
 */
const HEAD_BYTES = 128 * 1024
const TAG_EXIF_IFD = 0x8769
const TAG_DATE_ORIGINAL = 0x9003
const TAG_OFFSET_ORIGINAL = 0x9011

export async function readTakenAt(file: Blob): Promise<string | null> {
  try {
    const buf = await file.slice(0, HEAD_BYTES).arrayBuffer()
    return takenAtFromJpeg(new DataView(buf))
  } catch {
    return null
  }
}

function ascii(v: DataView, off: number, len: number): string {
  let s = ''
  for (let i = 0; i < len && off + i < v.byteLength; i++) {
    const c = v.getUint8(off + i)
    if (c === 0) break
    s += String.fromCharCode(c)
  }
  return s
}

/** Pure parser (unit-tested). */
export function takenAtFromJpeg(v: DataView): string | null {
  if (v.byteLength < 4 || v.getUint16(0) !== 0xffd8) return null
  let off = 2
  while (off + 4 <= v.byteLength) {
    if (v.getUint8(off) !== 0xff) return null
    const marker = v.getUint8(off + 1)
    const size = v.getUint16(off + 2)
    if (marker === 0xe1 && ascii(v, off + 4, 6) === 'Exif') return fromTiff(v, off + 10)
    if (marker === 0xda || size < 2) return null
    off += 2 + size
  }
  return null
}

function fromTiff(v: DataView, tiff: number): string | null {
  if (tiff + 8 > v.byteLength) return null
  const order = v.getUint16(tiff)
  if (order !== 0x4949 && order !== 0x4d4d) return null
  const le = order === 0x4949
  const u16 = (o: number) => v.getUint16(o, le)
  const u32 = (o: number) => v.getUint32(o, le)
  const entries = (ifd: number) => {
    const out = new Map<number, { type: number; count: number; valueOff: number }>()
    if (ifd + 2 > v.byteLength) return out
    const n = u16(ifd)
    for (let i = 0; i < n; i++) {
      const e = ifd + 2 + i * 12
      if (e + 12 > v.byteLength) break
      out.set(u16(e), { type: u16(e + 2), count: u32(e + 4), valueOff: e + 8 })
    }
    return out
  }
  const str = (e: { count: number; valueOff: number } | undefined) => {
    if (!e) return null
    const at = e.count <= 4 ? e.valueOff : tiff + u32(e.valueOff)
    return ascii(v, at, e.count)
  }
  const ifd0 = entries(tiff + u32(tiff + 4))
  const exifPtr = ifd0.get(TAG_EXIF_IFD)
  if (!exifPtr) return null
  const exif = entries(tiff + u32(exifPtr.valueOff))
  return parseExifDate(str(exif.get(TAG_DATE_ORIGINAL)), str(exif.get(TAG_OFFSET_ORIGINAL)))
}

/** `YYYY:MM:DD HH:MM:SS` (+ optional `±HH:MM`) → ISO, or null. */
export function parseExifDate(date: string | null, offset: string | null): string | null {
  const m = date?.match(/^(\d{4}):(\d{2}):(\d{2})[ T](\d{2}):(\d{2}):(\d{2})/)
  if (!m) return null
  const [y, mo, d, h, mi, s] = m.slice(1).map(Number)
  if (y < 1990 || mo < 1 || mo > 12 || d < 1 || d > 31 || h > 23 || mi > 59 || s > 59) return null
  const tz = offset?.match(/^([+-])(\d{2}):(\d{2})$/)
  const ms = tz
    ? Date.UTC(y, mo - 1, d, h, mi, s) - (tz[1] === '-' ? -1 : 1) * (Number(tz[2]) * 60 + Number(tz[3])) * 60_000
    : new Date(y, mo - 1, d, h, mi, s).getTime()
  return Number.isFinite(ms) ? new Date(ms).toISOString() : null
}
