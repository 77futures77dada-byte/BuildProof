import { createHash, randomBytes } from 'node:crypto'
import { createClient } from '@supabase/supabase-js'

export type ApiRequest = { method?: string; headers: Record<string, string | string[] | undefined>; body?: unknown; query?: Record<string, string | string[] | undefined> }
export type ApiResponse = { status(code: number): ApiResponse; json(body: unknown): void }
export const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export function bearer(req: ApiRequest) {
  const value = req.headers.authorization
  const header = Array.isArray(value) ? value[0] : value
  return header?.match(/^Bearer\s+(.+)$/i)?.[1] ?? null
}

export function linkToken() { return randomBytes(32).toString('base64url') }
export function tokenHash(value: string) { return createHash('sha256').update(value).digest('hex') }

export function clients() {
  const url = process.env.SUPABASE_URL
  const anon = process.env.SUPABASE_ANON_KEY
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !anon || !service) throw new Error('server_misconfigured')
  return {
    caller(token: string) { return createClient(url, anon, { global: { headers: { Authorization: `Bearer ${token}` } }, auth: { persistSession: false, autoRefreshToken: false } }) },
    admin: createClient(url, service, { auth: { persistSession: false, autoRefreshToken: false } }),
  }
}

export async function owner(req: ApiRequest) {
  const token = bearer(req)
  if (!token) return { error: 'unauthorized' as const }
  const { caller, admin } = clients()
  const { data, error } = await caller(token).auth.getUser(token)
  if (error || !data.user) return { error: 'unauthorized' as const }
  const { data: profile, error: profileError } = await caller(token).from('profiles')
    .select('id,company_id,role').eq('id', data.user.id).maybeSingle()
  if (profileError || !profile || profile.role !== 'gc' || !profile.company_id) return { error: 'forbidden' as const }
  return { admin, user: data.user, companyId: profile.company_id }
}

export function publicError(error: { message?: string } | null | undefined) {
  const message = error?.message ?? ''
  const known = ['invalid_worker_link','invalid_client_link','stage_not_found','invalid_percent','invalid_photo_count',
    'device_time_required','client_request_id_required','invalid_photo_path','worker_link_rate_limit','decrease_requires_account_report',
    'worker_link_limit','client_link_limit','invalid_expiry','invalid_display_name','invalid_project','stage_not_found']
  return known.find((code) => message.includes(code)) ?? 'request_failed'
}
