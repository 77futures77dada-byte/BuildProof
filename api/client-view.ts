import { bearer, clients, owner, UUID, type ApiRequest, type ApiResponse } from './lib/backend.ts'

type ClientView = { stages?: Array<{ photos?: Array<{ path: string; url?: string | null }> }> }

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

export default async function handler(req: ApiRequest, res: ApiResponse) {
  if (req.method !== 'GET' && req.method !== 'POST') return res.status(405).json({ error: 'method_not_allowed' })
  let admin
  try { admin = clients().admin } catch { return res.status(500).json({ error: 'server_misconfigured' }) }
  if (req.method === 'GET') {
    const token = bearer(req)
    if (!token || token.length < 32 || token.length > 128) return res.status(401).json({ error: 'invalid_client_link' })
    const { data, error } = await admin.rpc('client_project_view', { p_token: token, p_project_id: null, p_owner_id: null })
    if (error) return res.status(401).json({ error: 'invalid_client_link' })
    return res.status(200).json(await signPhotos(admin, data))
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
  return res.status(200).json(await signPhotos(caller.admin, data))
}
