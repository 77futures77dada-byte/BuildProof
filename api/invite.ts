import { createClient } from '@supabase/supabase-js'

type Request = { method?: string; headers: Record<string, string | string[] | undefined>; body?: unknown }
type Response = { status(code: number): Response; json(body: unknown): void }
type InviteBody = { email?: unknown; full_name?: unknown; role?: unknown; project_ids?: unknown; locale?: unknown }

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function createInviteHandler(clientFactory: typeof createClient = createClient) {
  return async function handler(req: Request, res: Response) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'method_not_allowed' })
  const authorization = req.headers.authorization
  const header = Array.isArray(authorization) ? authorization[0] : authorization
  const token = header?.match(/^Bearer\s+(.+)$/i)?.[1]
  if (!token) return res.status(401).json({ error: 'unauthorized' })

  const url = process.env.SUPABASE_URL
  const anonKey = process.env.SUPABASE_ANON_KEY
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  const siteUrl = process.env.SITE_URL
  if (!url || !anonKey || !serviceKey || !siteUrl) return res.status(500).json({ error: 'server_misconfigured' })

  const caller = clientFactory(url, anonKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  })
  const { data: authData, error: authError } = await caller.auth.getUser(token)
  if (authError || !authData.user) return res.status(401).json({ error: 'unauthorized' })
  const { data: profile, error: profileError } = await caller.from('profiles')
    .select('id,company_id,role').eq('id', authData.user.id).maybeSingle()
  if (profileError || !profile) return res.status(403).json({ error: 'forbidden' })
  if (profile.role !== 'gc' || !profile.company_id) return res.status(403).json({ error: 'forbidden' })

  const body = (req.body && typeof req.body === 'object' ? req.body : {}) as InviteBody
  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : ''
  const fullName = typeof body.full_name === 'string' ? body.full_name.trim() : ''
  const roles = ['foreman', 'worker', 'client'] as const
  const locale = body.locale === undefined ? 'ru' : body.locale
  const projectIds = body.project_ids === undefined ? [] : body.project_ids
  if (email.length > 254 || !EMAIL.test(email)) return res.status(400).json({ error: 'invalid_email' })
  if (fullName.length < 1 || fullName.length > 80) return res.status(400).json({ error: 'invalid_full_name' })
  if (typeof body.role !== 'string' || !(roles as readonly string[]).includes(body.role)) return res.status(400).json({ error: 'invalid_role' })
  if (!Array.isArray(projectIds) || projectIds.some((id) => typeof id !== 'string' || !UUID.test(id))) return res.status(400).json({ error: 'invalid_project_ids' })
  if (new Set(projectIds).size !== projectIds.length) return res.status(400).json({ error: 'invalid_project_ids' })
  if (locale !== 'et' && locale !== 'ru' && locale !== 'en') return res.status(400).json({ error: 'invalid_locale' })

  if (projectIds.length) {
    const { data: projects, error } = await caller.from('projects').select('id').eq('company_id', profile.company_id).in('id', projectIds)
    if (error) return res.status(500).json({ error: 'project_validation_failed' })
    if (!projects || projects.length !== projectIds.length) return res.status(403).json({ error: 'forbidden' })
  }

  const admin = clientFactory(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } })
  const { error: reserveError } = await admin.rpc('reserve_company_invite', {
    p_company_id: profile.company_id, p_inviter_id: authData.user.id, p_email: email,
  })
  if (reserveError) {
    if (reserveError.message.includes('invite_rate_limit')) return res.status(429).json({ error: 'invite_rate_limit' })
    return res.status(500).json({ error: 'invite_reservation_failed' })
  }

  const { data: invited, error: inviteError } = await admin.auth.admin.inviteUserByEmail(email, {
    redirectTo: `${siteUrl.replace(/\/$/, '')}/login`, data: { full_name: fullName },
  })
  if (inviteError || !invited.user) {
    // Duplicate accounts return one generic conflict to avoid exposing their tenant.
    if (inviteError?.message.toLowerCase().includes('already') || inviteError?.status === 422) {
      return res.status(409).json({ error: 'email_unavailable' })
    }
    return res.status(500).json({ error: 'invite_failed' })
  }
  if (!Array.isArray(invited.user.identities) || invited.user.identities.length === 0) {
    return res.status(409).json({ error: 'email_unavailable' })
  }

  try {
    const { error: insertProfileError } = await admin.from('profiles').insert({
      id: invited.user.id, company_id: profile.company_id, full_name: fullName, role: body.role, locale,
    })
    if (insertProfileError) throw insertProfileError
    if (projectIds.length) {
      const { error: accessError } = await admin.from('project_access').insert(
        projectIds.map((projectId) => ({ project_id: projectId as string, user_id: invited.user.id })),
      )
      if (accessError) throw accessError
    }
  } catch {
    let rollbackError: Error | null = null
    for (let attempt = 0; attempt < 2; attempt += 1) {
      const { error } = await admin.auth.admin.deleteUser(invited.user.id)
      if (!error) { rollbackError = null; break }
      rollbackError = error
    }
    if (rollbackError) {
      await admin.from('project_access').delete().eq('user_id', invited.user.id)
      await admin.from('profiles').delete().eq('id', invited.user.id)
      return res.status(500).json({ error: 'invite_setup_rollback_failed' })
    }
    return res.status(500).json({ error: 'invite_setup_failed_user_rolled_back' })
  }

  return res.status(201).json({ user_id: invited.user.id })
  }
}

export default createInviteHandler()
