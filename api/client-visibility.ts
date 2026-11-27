import { owner, UUID, type ApiRequest, type ApiResponse } from './lib/backend.ts'

export default async function handler(req: ApiRequest, res: ApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'method_not_allowed' })
  let caller
  try { caller = await owner(req) } catch { return res.status(500).json({ error: 'server_misconfigured' }) }
  if ('error' in caller) return res.status(caller.error === 'unauthorized' ? 401 : 403).json({ error: caller.error })
  const body = req.body && typeof req.body === 'object' ? req.body as Record<string, unknown> : {}
  if (typeof body.project_id !== 'string' || !UUID.test(body.project_id) || typeof body.stage_id !== 'string' || !UUID.test(body.stage_id)
    || typeof body.visible !== 'boolean' || typeof body.photos_visible !== 'boolean') return res.status(400).json({ error: 'invalid_visibility' })
  const { data: project } = await caller.admin.from('projects').select('id').eq('id',body.project_id).eq('company_id',caller.companyId).maybeSingle()
  if (!project) return res.status(404).json({ error: 'project_not_found' })
  const { error } = await caller.admin.rpc('set_client_stage_visibility', {
    p_project_id: body.project_id,p_stage_id: body.stage_id,p_owner_id: caller.user.id,
    p_visible: body.visible,p_photos_visible: body.photos_visible,
  })
  if (error) return res.status(error.message.includes('stage_not_found') ? 404 : 400).json({ error: error.message.includes('stage_not_found') ? 'stage_not_found' : 'visibility_update_failed' })
  return res.status(200).json({ updated: true })
}
