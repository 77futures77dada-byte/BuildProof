import { supabase } from './supabaseClient'

/**
 * Owner side of worker / client links (docs/contracts/worker-links.md,
 * docs/contracts/client-links.md). Every call carries the owner's Supabase JWT.
 * The raw link token exists only in the create response; it is never stored or logged here.
 */

export type LinkKind = 'worker' | 'client'
export type LinkState = 'active' | 'expired' | 'revoked'

export interface LinkRecord {
  id: string
  project_id: string
  display_name: string
  created_at: string
  expires_at: string
  revoked_at: string | null
  last_used_at: string | null
}

export interface CreatedLink {
  link_id: string
  token: string
  display_name: string
  expires_at: string
}

export interface ClientViewStage {
  stage_id: string
  name: string
  confirmed_percent: number
  updated_at: string | null
  photos: { path: string; url: string | null }[]
}

export interface ClientViewData {
  project_id: string
  project_name: string
  disclaimer: string
  stages: ClientViewStage[]
}

export const DEFAULT_DAYS = 30
export const MAX_DAYS = 90
const DAY = 86400e3

const ENDPOINT: Record<LinkKind, string> = { worker: '/api/worker-links', client: '/api/client-links' }
const PATH: Record<LinkKind, string> = { worker: '/w', client: '/c' }

/** The link the owner sends: the token sits in the fragment only, so it never reaches a server log. */
export function linkUrl(kind: LinkKind, token: string, origin: string): string {
  return `${origin}${PATH[kind]}#t=${encodeURIComponent(token)}`
}

export function linkState(link: Pick<LinkRecord, 'expires_at' | 'revoked_at'>, now: number): LinkState {
  if (link.revoked_at) return 'revoked'
  return new Date(link.expires_at).getTime() <= now ? 'expired' : 'active'
}

/** Whole days 1…90; anything else falls back to the 30-day default. */
export function clampDays(value: number): number {
  if (!Number.isFinite(value)) return DEFAULT_DAYS
  return Math.min(MAX_DAYS, Math.max(1, Math.round(value)))
}

/** expires_at for a lifetime in days; a minute short of the limit so the server's 90-day check never trips on clock skew. */
export function expiryIso(days: number, now: number): string {
  const d = clampDays(days)
  return new Date(now + d * DAY - (d === MAX_DAYS ? 60e3 : 0)).toISOString()
}

const KNOWN_ERRORS = new Set([
  'unauthorized', 'forbidden', 'invalid_display_name', 'invalid_expiry', 'project_not_found', 'worker_link_limit',
  'client_link_limit', 'link_not_found', 'invalid_visibility', 'stage_not_found', 'network',
])

/** API error code → i18n key under `links.error.*` (unknown codes → generic). */
export function errorKey(code: string | undefined): string {
  return `links.error.${code && KNOWN_ERRORS.has(code) ? code : 'generic'}`
}

export class LinksApiError extends Error {
  readonly code: string
  constructor(code: string) {
    super(code)
    this.code = code
  }
}

async function post<T>(url: string, body: unknown): Promise<T> {
  const { data } = await supabase.auth.getSession()
  const token = data.session?.access_token
  let res: Response
  try {
    res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token ?? ''}` },
      body: JSON.stringify(body),
    })
  } catch {
    throw new LinksApiError('network')
  }
  const json = (await res.json().catch(() => ({}))) as T & { error?: string }
  if (!res.ok) throw new LinksApiError(json.error ?? `http_${res.status}`)
  return json
}

export async function listLinks(kind: LinkKind, projectId: string): Promise<LinkRecord[]> {
  const res = await post<{ links?: LinkRecord[] }>(ENDPOINT[kind], { action: 'list', project_id: projectId })
  return res.links ?? []
}

export function createLink(kind: LinkKind, projectId: string, displayName: string, days: number, now = Date.now()): Promise<CreatedLink> {
  return post<CreatedLink>(ENDPOINT[kind], {
    action: 'create', project_id: projectId, display_name: displayName.trim(), expires_at: expiryIso(days, now),
  })
}

export async function revokeLink(kind: LinkKind, linkId: string): Promise<void> {
  await post<{ revoked: boolean }>(ENDPOINT[kind], { action: 'revoke', link_id: linkId })
}

export async function setClientVisibility(projectId: string, stageId: string, visible: boolean, photosVisible: boolean) {
  // visible=false forces photos off on the server; mirror it so the stored state matches.
  await post<{ updated: boolean }>('/api/client-visibility', {
    project_id: projectId, stage_id: stageId, visible, photos_visible: visible && photosVisible,
  })
}

export function ownerClientView(projectId: string): Promise<ClientViewData> {
  return post<ClientViewData>('/api/client-view', { project_id: projectId })
}

/**
 * Visibility is write-only in the API (no GET yet). The last choice made on this
 * device is kept per project; the preview fills in stages it already shows.
 */
export type VisibilityMap = Record<string, { visible: boolean; photos: boolean }>
const visKey = (projectId: string) => `buildproof.clientVisibility.${projectId}`

export function readVisibility(projectId: string): VisibilityMap {
  try {
    const raw = JSON.parse(localStorage.getItem(visKey(projectId)) ?? '{}') as unknown
    return raw && typeof raw === 'object' ? (raw as VisibilityMap) : {}
  } catch {
    return {}
  }
}

export function writeVisibility(projectId: string, map: VisibilityMap) {
  try { localStorage.setItem(visKey(projectId), JSON.stringify(map)) } catch { /* private mode */ }
}

/** Stored choices, plus: a stage in the preview is visible; a stage with photos there has photos on. */
export function mergeVisibility(stored: VisibilityMap, preview: ClientViewData | null): VisibilityMap {
  const out: VisibilityMap = { ...stored }
  for (const s of preview?.stages ?? []) {
    const prev = out[s.stage_id]
    out[s.stage_id] = { visible: true, photos: (prev?.photos ?? false) || s.photos.length > 0 }
  }
  return out
}
