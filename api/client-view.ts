import { bearer, clients, owner, UUID, type ApiRequest, type ApiResponse } from './lib/backend.ts'
import { contractorContact } from './lib/link-page-data.ts'

type ClientView = {
  project_id?: string
  stages?: Array<{ photos?: Array<{ path: string; url?: string | null }> }>
  contractor_contact?: { name: string | null; email: string | null; phone: string | null }
}

async function signPhotos(admin: ReturnType<typeof clients>['admin'], data: ClientView | null) {
  for (const stage of data?.stages ?? []) {
    const paths = (stage.photos ?? []).map((photo: { path: string }) => photo.path)
    if (!paths.length) continue
    const { data: signed } = await admin.storage.from('project-photos').createSignedUrls(paths, 300)
    stage.photos = stage.photos.map((photo: { path: string }, index: number) => ({
      ...photo, url: signed?.[index]?.signedUrl ?? null,
    }))
  }
  return data
}

async function addContractorContact(admin: ReturnType<typeof clients>['admin'], data: ClientView | null) {
  if (!data?.project_id) return data
  const projectId = data.project_id
  const { data: project, error: projectError } = await admin.from('projects').select('company_id').eq('id',projectId).maybeSingle()
  if (projectError || !project) throw new Error('contractor_contact_unavailable')
  const { data: profile, error: profileError } = await admin.from('profiles').select('id,full_name')
    .eq('company_id',project.company_id).eq('role','gc').order('id').limit(1).maybeSingle()
  if (profileError) throw new Error('contractor_contact_unavailable')
  let account = null
  if (profile?.id) {
    const result = await admin.auth.admin.getUserById(profile.id)
    if (result.error) throw new Error('contractor_contact_unavailable')
    account = result.data.user
  }
  return { ...data, contractor_contact: contractorContact(profile,account) }
}

export default async function handler(req: ApiRequest, res: ApiResponse) {
  if (req.method !== 'GET' && req.method !== 'POST') return res.status(405).json({ error: 'method_not_allowed' })
  let admin
  try { admin = clients().admin } catch { return res.status(500).json({ error: 'server_misconfigured' }) }
  if (req.method === 'GET') {
    const token = bearer(req)
    if (!token || token.length < 32 || token.length > 128) return res.status(401).json({ error: 'invalid_client_link' })
    const { data, error } = await admin.rpc('client_project_view', { p_token: token, p_project_id: null, p_owner_id: null })
    if (error) return res.status(401).json({ error: 'invalid_client_link' })
    try { return res.status(200).json(await signPhotos(admin, await addContractorContact(admin,data))) }
    catch { return res.status(500).json({ error: 'contractor_contact_unavailable' }) }
  }
  let caller
  try { caller = await owner(req) } catch { return res.status(500).json({ error: 'server_misconfigured' }) }
  if ('error' in caller) return res.status(caller.error === 'unauthorized' ? 401 : 403).json({ error: caller.error })
  const body = req.body && typeof req.body === 'object' ? req.body as Record<string, unknown> : {}
  if (typeof body.project_id !== 'string' || !UUID.test(body.project_id)) return res.status(400).json({ error: 'invalid_project_id' })
  const { data, error } = await caller.admin.rpc('client_project_view', {
    p_token: null,p_project_id: body.project_id,p_owner_id: caller.user.id,
  })
  if (error) return res.status(404).json({ error: 'project_not_found' })
  try { return res.status(200).json(await signPhotos(caller.admin, await addContractorContact(caller.admin,data))) }
  catch { return res.status(500).json({ error: 'contractor_contact_unavailable' }) }
}
