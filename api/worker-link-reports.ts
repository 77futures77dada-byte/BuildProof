import { bearer, clients, publicError, type ApiRequest, type ApiResponse } from './lib/backend.ts'

export default async function handler(req: ApiRequest, res: ApiResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'method_not_allowed' })
  const token = bearer(req)
  if (!token || token.length < 32 || token.length > 128) return res.status(401).json({ error: 'invalid_worker_link' })
  const rawLimit = Array.isArray(req.query?.limit) ? req.query?.limit[0] : req.query?.limit
  const limit = rawLimit ? Number(rawLimit) : 20
  if (!Number.isInteger(limit) || limit < 1 || limit > 50) return res.status(400).json({ error: 'invalid_limit' })
  let admin
  try { admin = clients().admin } catch { return res.status(500).json({ error: 'server_misconfigured' }) }
  const { data, error } = await admin.rpc('worker_link_reports', { p_token: token, p_limit: limit })
  if (error) return res.status(401).json({ error: publicError(error) })
  const reports = Array.isArray(data) ? data as Array<Record<string, unknown>> : []
  for (const report of reports) {
    const paths = Array.isArray(report.photos) ? report.photos.filter((path): path is string => typeof path === 'string') : []
    if (!paths.length) continue
    const { data: signed } = await admin.storage.from('project-photos').createSignedUrls(paths, 300)
    report.photos = paths.map((path, index) => ({ path, url: signed?.[index]?.signedUrl ?? null }))
  }
  return res.status(200).json({ reports })
}
