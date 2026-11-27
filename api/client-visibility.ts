import { owner, UUID, type ApiRequest, type ApiResponse } from './lib/backend.ts'
import { visibilityByStage } from './lib/link-page-data.ts'

export default async function handler(req: ApiRequest, res: ApiResponse) {
  if (req.method !== 'POST' && req.method !== 'GET') return res.status(405).json({ error: 'method_not_allowed' })
  let caller
  try { caller = await owner(req) } catch { return res.status(500).json({ error: 'server_misconfigured' }) }
  if ('error' in caller) return res.status(caller.error === 'unauthorized' ? 401 : 403).json({ error: caller.error })
  if (req.method === 'GET') {
    const value = req.query?.project_id
    const projectId = Array.isArray(value) ? value[0] : value
    if (typeof projectId !== 'string' || !UUID.test(projectId)) return res.status(400).json({ error: 'invalid_visibility' })
    const { data: project } = await caller.admin.from('projects').select('id').eq('id',projectId).eq('company_id',caller.companyId).maybeSingle()
    if (!project) return res.status(404).json({ error: 'project_not_found' })
    const [{ data: stages, error: stageError }, { data: saved, error: visibilityError }] = await Promise.all([
      caller.admin.from('project_stages').select('id').eq('project_id',projectId),
      caller.admin.from('project_stage_client_visibility').select('project_stage_id,visible,photos_visible').eq('project_id',projectId),
    ])
    if (stageError || visibilityError) return res.status(500).json({ error: 'visibility_read_failed' })
    return res.status(200).json({ visibility: visibilityByStage(stages ?? [],saved ?? []) })
  }
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
