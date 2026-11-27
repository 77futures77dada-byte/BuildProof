import { bearer, clients, publicError, type ApiRequest, type ApiResponse } from './lib/backend.ts'

export default async function handler(req: ApiRequest, res: ApiResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'method_not_allowed' })
  const token = bearer(req)
  if (!token || token.length < 32 || token.length > 128) return res.status(401).json({ error: 'invalid_worker_link' })
  let admin
  try { admin = clients().admin } catch { return res.status(500).json({ error: 'server_misconfigured' }) }
  const { data, error } = await admin.rpc('worker_link_stages', { p_token: token })
  if (error) return res.status(401).json({ error: publicError(error) })
  return res.status(200).json(data)
}
