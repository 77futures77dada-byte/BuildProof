import type { Draft, DraftError, DraftTransport } from './drafts'

/**
 * Public link API (docs/contracts/worker-links.md, client-links.md). Every call
 * carries the link token as `Authorization: Bearer`; no Supabase session, no
 * Supabase client in this module (the /w and /c pages never load it).
 * The token is never logged.
 */

export interface WorkerLinkStage { id: string; name: string; progress_percent: number }
export interface WorkerLinkStages { project_id: string; worker_name: string; stages: WorkerLinkStage[] }
export interface LinkPhoto { path: string; url: string | null }
export type WorkerReportStatus = 'accepted' | 'pending' | 'confirmed' | 'rejected' | 'returned' | string
export interface WorkerLinkReport {
  id: string
  stage_id: string
  claimed_percent: number
  status: WorkerReportStatus
  created_at: string
  taken_at: string | null
  device_time: string | null
  uploaded_at: string | null
  photos: LinkPhoto[]
}
export interface WorkerLinkSubmitResult {
  report_id: string
  status?: string
  duplicate_of?: string | null
  duplicate_request?: boolean
}

/** Same shape as the owner preview (POST /api/client-view). */
export interface ClientViewStage {
  stage_id: string
  name: string
  confirmed_percent: number
  updated_at: string | null
  photos: LinkPhoto[]
}
export interface ClientViewData {
  project_id: string
  project_name: string
  disclaimer: string
  stages: ClientViewStage[]
}

export type DecreaseReason = 'rework' | 'count_error' | 'demolition'
export const DECREASE_REASONS: readonly DecreaseReason[] = ['rework', 'count_error', 'demolition']

/** No answer within 20 s = `unknown` (01 §3.4), same as the app transport. */
const ANSWER_MS = 20_000

export class LinkApiError extends Error {
  readonly code: string
  readonly status: number
  constructor(code: string, status: number) {
    super(code)
    this.name = 'LinkApiError'
    this.code = code
    this.status = status
  }
}

export type FetchLike = (input: string, init?: RequestInit) => Promise<Response>

async function call<T>(path: string, token: string, init: RequestInit = {}, f: FetchLike = fetch): Promise<T> {
  const ctrl = typeof AbortController === 'undefined' ? null : new AbortController()
  const timer = setTimeout(() => ctrl?.abort(), ANSWER_MS)
  let res: Response
  try {
    res = await f(path, {
      ...init,
      signal: ctrl?.signal,
      headers: { ...(init.body ? { 'Content-Type': 'application/json' } : {}), Authorization: `Bearer ${token}` },
    })
  } catch (err) {
    const aborted = (err as { name?: string } | null)?.name === 'AbortError'
    throw new LinkApiError(aborted ? 'timeout' : 'network', 0)
  } finally {
    clearTimeout(timer)
  }
  const json = (await res.json().catch(() => ({}))) as T & { error?: string }
  if (!res.ok) throw new LinkApiError(typeof json.error === 'string' ? json.error : `http_${res.status}`, res.status)
  return json
}

export function fetchWorkerStages(token: string, f?: FetchLike): Promise<WorkerLinkStages> {
  return call<WorkerLinkStages>('/api/worker-link-stages', token, {}, f)
}

export async function fetchWorkerReports(token: string, limit = 20, f?: FetchLike): Promise<WorkerLinkReport[]> {
  const res = await call<{ reports?: WorkerLinkReport[] }>(`/api/worker-link-reports?limit=${limit}`, token, {}, f)
  return (res.reports ?? []).map((r) => ({ ...r, photos: (r.photos ?? []).map(normalisePhoto) }))
}

export function fetchClientView(token: string, f?: FetchLike): Promise<ClientViewData> {
  return call<ClientViewData>('/api/client-view', token, {}, f)
}

/** reports may list bare paths when signing failed. */
function normalisePhoto(p: LinkPhoto | string): LinkPhoto {
  return typeof p === 'string' ? { path: p, url: null } : p
}

export interface SubmitBody {
  stage_id: string
  claimed_percent: number
  taken_at: string | null
  device_time: string
  client_request_id: string
  decrease_reason: DecreaseReason | null
  photos: { content_type: string; base64: string }[]
}

export function submitWorkerReport(token: string, body: SubmitBody, f?: FetchLike): Promise<WorkerLinkSubmitResult> {
  return call<WorkerLinkSubmitResult>('/api/worker-link-submit', token, { method: 'POST', body: JSON.stringify(body) }, f)
}

export async function blobToBase64(b: Blob): Promise<string> {
  const bytes = new Uint8Array(await b.arrayBuffer())
  let bin = ''
  const CHUNK = 0x8000
  for (let i = 0; i < bytes.length; i += CHUNK) bin += String.fromCharCode(...bytes.subarray(i, i + CHUNK))
  return btoa(bin)
}

function asReason(r: string | null): DecreaseReason | null {
  return r && (DECREASE_REASONS as readonly string[]).includes(r) ? (r as DecreaseReason) : null
}

export async function submitBodyFor(d: Draft, percent: number, reason: string | null): Promise<SubmitBody> {
  const blobs = d.photos?.length ? d.photos : d.photo ? [d.photo] : []
  return {
    stage_id: d.stageId,
    claimed_percent: percent,
    taken_at: d.takenAt ?? null,
    device_time: d.deviceTime ?? new Date(d.createdAt).toISOString(),
    client_request_id: d.draftId,
    decrease_reason: asReason(reason),
    photos: await Promise.all(blobs.map(async (b) => ({ content_type: b.type || 'image/jpeg', base64: await blobToBase64(b) }))),
  }
}

const DRAFT_CODES: Record<string, DraftError> = {
  network: 'network',
  timeout: 'timeout',
  invalid_worker_link: 'auth',
  worker_link_rate_limit: 'rate_limit',
  invalid_percent: 'invalid_percent',
  decrease_reason_required: 'comment_required',
  invalid_decrease_reason: 'comment_required',
  invalid_photo_count: 'photo_invalid',
  invalid_photo: 'photo_invalid',
  photo_size_or_type_invalid: 'photo_invalid',
  total_photo_size_exceeded: 'photo_invalid',
  stage_not_found: 'stage_not_found',
}

/** Any thrown value → DraftError (network / timeout / contract code). */
export function classifyLinkError(err: unknown): DraftError {
  if (err instanceof LinkApiError) {
    if (err.code in DRAFT_CODES) return DRAFT_CODES[err.code]
    return err.status >= 500 ? 'network' : 'other'
  }
  if (typeof navigator !== 'undefined' && navigator.onLine === false) return 'network'
  if (err instanceof TypeError) return 'network'
  return 'other'
}

/** i18n key for a DraftError on the link page. */
export function linkDraftErrorKey(e: DraftError | null): string | null {
  switch (e) {
    case null: return null
    case 'network': return 'linkPage.error.network'
    case 'timeout': return 'linkPage.error.timeout'
    case 'auth': return 'linkPage.error.invalidLink'
    case 'rate_limit': return 'linkPage.error.rateLimit'
    case 'photo_invalid': return 'linkPage.error.photo'
    case 'stage_not_found': return 'linkPage.error.stageNotFound'
    case 'comment_required': return 'linkPage.error.reasonRequired'
    case 'invalid_percent': return 'linkPage.error.percent'
    default: return 'linkPage.error.generic'
  }
}

/** i18n key for a page-level load error (stages, reports, client view). */
export function linkLoadErrorKey(code: string): string {
  if (code === 'invalid_worker_link' || code === 'invalid_client_link') return 'linkPage.error.invalidLink'
  if (code === 'network') return 'linkPage.error.loadNetwork'
  if (code === 'timeout') return 'linkPage.error.timeout'
  return 'linkPage.error.generic'
}

/** Draft queue transport for a worker link (one POST with photos; server dedupes by client_request_id). */
export function workerLinkTransport(token: string, f?: FetchLike): DraftTransport {
  return {
    async currentPercent(stageId) {
      const res = await fetchWorkerStages(token, f)
      const s = res.stages.find((x) => x.id === stageId)
      if (!s) throw new LinkApiError('stage_not_found', 400)
      return s.progress_percent
    },
    async upload() { /* photos travel inside submitDraft */ },
    async reportIdForPath() { return null },
    async submit() { throw new Error('use submitDraft') },
    classify: classifyLinkError,
    async submitDraft(d, percent, reason) {
      await submitWorkerReport(token, await submitBodyFor(d, percent, reason), f)
    },
  }
}
