import { owner, tokenHash, UUID, linkToken, type ApiRequest, type ApiResponse } from './lib/backend.ts'

export default async function handler(req: ApiRequest, res: ApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'method_not_allowed' })
  let caller
  try { caller = await owner(req) } catch { return res.status(500).json({ error: 'server_misconfigured' }) }
  if ('error' in caller) return res.status(caller.error === 'unauthorized' ? 401 : 403).json({ error: caller.error })
  const body = req.body && typeof req.body === 'object' ? req.body as Record<string, unknown> : {}
  if (body.action === 'list') {
    if (typeof body.project_id !== 'string' || !UUID.test(body.project_id)) return res.status(400).json({ error: 'invalid_project_id' })
    const { data: project } = await caller.admin.from('projects').select('id').eq('id',body.project_id).eq('company_id',caller.companyId).maybeSingle()
    if (!project) return res.status(404).json({ error: 'project_not_found' })
    const { data, error } = await caller.admin.from('worker_links')
      .select('id,project_id,display_name,created_at,expires_at,revoked_at,last_used_at')
      .eq('project_id',project.id).order('created_at',{ ascending:false })
    if (error) return res.status(500).json({ error: 'link_list_failed' })
    return res.status(200).json({ links:data ?? [] })
  }
  if (body.action === 'revoke') {
    if (typeof body.link_id !== 'string' || !UUID.test(body.link_id)) return res.status(400).json({ error: 'invalid_link_id' })
    const { data, error } = await caller.admin.rpc('revoke_worker_link', { p_link_id: body.link_id, p_company_id: caller.companyId })
    if (error) return res.status(500).json({ error: 'revoke_failed' })
    return res.status(data ? 200 : 404).json(data ? { revoked: true } : { error: 'link_not_found' })
  }
  if (body.action !== 'create') return res.status(400).json({ error: 'invalid_action' })
  if (typeof body.project_id !== 'string' || !UUID.test(body.project_id)) return res.status(400).json({ error: 'invalid_project_id' })
  if (typeof body.display_name !== 'string' || body.display_name.trim().length < 1 || body.display_name.trim().length > 80)
    return res.status(400).json({ error: 'invalid_display_name' })
  const expiry = body.expires_at === undefined ? Date.now() + 30 * 86400000 : Date.parse(String(body.expires_at))
  if (!Number.isFinite(expiry) || expiry <= Date.now() || expiry > Date.now() + 90 * 86400000) return res.status(400).json({ error: 'invalid_expiry' })
  const { data: project, error: projectError } = await caller.admin.from('projects').select('id,company_id')
    .eq('id', body.project_id).eq('company_id', caller.companyId).maybeSingle()
  if (projectError || !project) return res.status(404).json({ error: 'project_not_found' })
  const secret = linkToken()
  const { data: linkId, error } = await caller.admin.rpc('create_worker_link', {
    p_project_id: project.id, p_created_by: caller.user.id, p_display_name: body.display_name.trim(),
    p_token_hash: tokenHash(secret), p_expires_at: new Date(expiry).toISOString(),
  })
  if (error) return res.status(400).json({ error: error.message.includes('worker_link_limit') ? 'worker_link_limit' : 'link_create_failed' })
  return res.status(201).json({ link_id: linkId, token: secret, display_name: body.display_name.trim(), expires_at: new Date(expiry).toISOString() })
}
