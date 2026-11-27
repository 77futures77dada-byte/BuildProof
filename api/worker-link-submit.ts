import { createHash, randomUUID } from 'node:crypto'
import { bearer, clients, publicError, UUID, type ApiRequest, type ApiResponse } from './lib/backend.ts'

const MAX_FILE = 2 * 1024 * 1024
const MAX_TOTAL = 3 * 1024 * 1024
const MIME_EXT: Record<string, string> = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' }
type PhotoInput = { base64?: unknown; content_type?: unknown }

function imageOk(data: Buffer, mime: string) {
  if (mime === 'image/jpeg') return data.length >= 3 && data[0] === 0xff && data[1] === 0xd8 && data[2] === 0xff
  if (mime === 'image/png') return data.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10]))
  return mime === 'image/webp' && data.length >= 12 && data.toString('ascii', 0, 4) === 'RIFF' && data.toString('ascii', 8, 12) === 'WEBP'
}

export default async function handler(req: ApiRequest, res: ApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'method_not_allowed' })
  const token = bearer(req)
  if (!token || token.length < 32 || token.length > 128) return res.status(401).json({ error: 'invalid_worker_link' })
  const body = req.body && typeof req.body === 'object' ? req.body as Record<string, unknown> : {}
  if (typeof body.stage_id !== 'string' || !UUID.test(body.stage_id)
    || typeof body.client_request_id !== 'string' || !UUID.test(body.client_request_id)) return res.status(400).json({ error: 'invalid_report' })
  const claimed = Number(body.claimed_percent)
  if (!Number.isInteger(claimed) || claimed < 0 || claimed > 100) return res.status(400).json({ error: 'invalid_percent' })
  const deviceTime = typeof body.device_time === 'string' ? Date.parse(body.device_time) : NaN
  const takenTime = typeof body.taken_at === 'string' ? Date.parse(body.taken_at) : null
  if (!Number.isFinite(deviceTime) || (takenTime !== null && !Number.isFinite(takenTime))) return res.status(400).json({ error: 'invalid_time' })
  const decreaseReason = body.decrease_reason === undefined ? null : body.decrease_reason
  if (decreaseReason !== null && !['rework','count_error','demolition'].includes(String(decreaseReason))) return res.status(400).json({ error: 'invalid_decrease_reason' })
  if (!Array.isArray(body.photos) || body.photos.length < 1 || body.photos.length > 5) return res.status(400).json({ error: 'invalid_photo_count' })
  const photos: Array<{ data: Buffer; mime: string; ext: string }> = []
  let total = 0
  for (const value of body.photos as PhotoInput[]) {
    const mime = typeof value?.content_type === 'string' ? value.content_type.toLowerCase() : ''
    const encoded = typeof value?.base64 === 'string' ? value.base64.replace(/^data:[^;]+;base64,/, '') : ''
    if (!MIME_EXT[mime] || !encoded || !/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(encoded))
      return res.status(400).json({ error: 'invalid_photo' })
    const data = Buffer.from(encoded, 'base64')
    if (!data.length || data.length > MAX_FILE || !imageOk(data, mime)) return res.status(413).json({ error: 'photo_size_or_type_invalid' })
    total += data.length
    if (total > MAX_TOTAL) return res.status(413).json({ error: 'total_photo_size_exceeded' })
    photos.push({ data, mime, ext: MIME_EXT[mime] })
  }
  let admin
  try { admin = clients().admin } catch { return res.status(500).json({ error: 'server_misconfigured' }) }
  const { data: linkRows, error: authError } = await admin.rpc('authorize_worker_link', { p_token: token })
  const link = Array.isArray(linkRows) ? linkRows[0] : null
  if (authError || !link) return res.status(401).json({ error: 'invalid_worker_link' })
  const uploaded: string[] = []
  for (const photo of photos) {
    const path = `${link.project_id}/worker-links/${link.link_id}/${randomUUID()}.${photo.ext}`
    const { error } = await admin.storage.from('project-photos').upload(path, photo.data, { contentType: photo.mime, upsert: false })
    if (error) {
      if (uploaded.length) await admin.storage.from('project-photos').remove(uploaded)
      if (error.message.includes('company_storage_limit_exceeded')) return res.status(413).json({ error: 'company_storage_limit_exceeded' })
      if (error.message.includes('company_project_limit_exceeded')) return res.status(409).json({ error: 'company_project_limit_exceeded' })
      return res.status(500).json({ error: 'photo_upload_failed' })
    }
    uploaded.push(path)
  }
  const hash = createHash('sha256').update(Buffer.concat(photos.map((p) => p.data))).digest('hex')
  const { data, error } = await admin.rpc('submit_worker_link_report', {
    p_token: token, p_stage_id: body.stage_id, p_claimed_percent: claimed,
    p_taken_at: takenTime === null ? null : new Date(takenTime).toISOString(),
    p_device_time: new Date(deviceTime).toISOString(), p_photo_paths: uploaded,
    p_phash: hash, p_client_request_id: body.client_request_id,p_decrease_reason: decreaseReason,
  })
  if (error) {
    await admin.storage.from('project-photos').remove(uploaded)
    const code = publicError(error)
    return res.status(code === 'worker_link_rate_limit' ? 429 : code === 'invalid_worker_link' ? 401 : 400).json({ error: code })
  }
  if (data?.duplicate_request) await admin.storage.from('project-photos').remove(uploaded)
  return res.status(200).json(data)
}
