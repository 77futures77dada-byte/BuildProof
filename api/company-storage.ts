import { owner, type ApiRequest, type ApiResponse } from './lib/backend.ts'

export default async function handler(req: ApiRequest, res: ApiResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'method_not_allowed' })
  let caller
  try { caller = await owner(req) } catch { return res.status(500).json({ error: 'server_misconfigured' }) }
  if ('error' in caller) return res.status(caller.error === 'unauthorized' ? 401 : 403).json({ error: caller.error })
  const { data, error } = await caller.admin.rpc('company_storage_usage', {
    p_company_id: caller.companyId, p_actor_id: caller.user.id,
  })
  if (error || !data) return res.status(500).json({ error: 'storage_usage_failed' })
  return res.status(200).json(data)
}
