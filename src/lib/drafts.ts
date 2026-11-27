/**
 * Report drafts on the phone (01-business-flow §3.4, brief §2.1б п.4).
 *
 * One IndexedDB record per draft (native IndexedDB, no extra dependency). The
 * queue logic is pure and takes its store and transport as arguments so it is
 * unit-tested without a browser (drafts.test.ts).
 *
 * Rules that matter (06-audit-stage1-residual):
 * - Б4-М1: a decrease with a reason is never changed automatically. If the stage
 *   moved since the worker saw it, the draft becomes `stale` and waits for a
 *   manual choice («Не принято: этап уже N%»).
 * - Б4-М2: drafts are sent independently. A stuck draft never blocks the rest;
 *   each one keeps its own `lastError` so the banner can say why.
 */

export type DraftState = 'editing' | 'queued' | 'unknown' | 'stale' | 'sent'

/** Why the last attempt did not go through (one code per RPC error, 01 §3.4). */
export type DraftError =
  | 'network'
  | 'timeout'
  | 'auth'
  | 'forbidden'
  | 'photo_required'
  | 'nothing_to_report'
  | 'invalid_photo_path'
  | 'comment_required'
  | 'invalid_percent'
  /** Worker link: too many reports this hour; retry later (worker_link_rate_limit). */
  | 'rate_limit'
  /** Worker link: photo type/size rejected; retake needed. */
  | 'photo_invalid'
  /** Worker link: the stage is no longer in this object. */
  | 'stage_not_found'
  | 'other'

export interface Draft {
  draftId: string
  userId: string
  projectId: string
  stageId: string
  /** Stage name at capture time, for the banner when the stage list is not loaded. */
  stageName: string
  /** The stage % the worker saw on the sheet («было»). */
  seenPercent: number
  /** Absolute new % («станет»). Equal to `seenPercent` = photo only. */
  newPercent: number
  /** Decrease reason (localised label sent as the report comment), null otherwise. */
  reason: string | null
  photo: Blob | null
  /** `{projectId}/{stageId}/{draftId}.jpg` — fixed for the life of the draft. */
  storagePath: string
  state: DraftState
  createdAt: number
  attempts: number
  lastAttemptAt: number | null
  lastError: DraftError | null
  /** Current stage % that made the draft `stale` (shown as «этап уже N%»). */
  stalePercent: number | null
  /** Worker link only: 1–5 compressed photos (the app draft uses `photo`). */
  photos?: Blob[]
  /** Worker link only: EXIF DateTimeOriginal read before compression (ISO), or null. */
  takenAt?: string | null
  /** Worker link only: device clock when the report was made (ISO). */
  deviceTime?: string
}

/** Unsent drafts a phone keeps (01 §3.4 rule 7); only enforced without network. */
export const DRAFT_LIMIT = 10
/** `editing` older than this becomes `queued` (01 §3.4 rule 1). */
export const EDITING_TTL_MS = 24 * 60 * 60 * 1000
/** Auto-retry delays, then repeat the last; stop after RETRY_STOP_MS (01 §3.4). */
export const RETRY_DELAYS_MS = [15_000, 30_000, 60_000, 120_000]
export const RETRY_STOP_MS = 30 * 60 * 1000

export function draftStoragePath(projectId: string, stageId: string, draftId: string): string {
  return `${projectId}/${stageId}/${draftId}.jpg`
}

export function newDraftId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID()
  return `${Date.now().toString(16)}-${Math.random().toString(16).slice(2)}`
}

export function isPhotoOnly(d: Pick<Draft, 'seenPercent' | 'newPercent'>): boolean {
  return d.newPercent === d.seenPercent
}
export function isDecrease(d: Pick<Draft, 'seenPercent' | 'newPercent'>): boolean {
  return d.newPercent < d.seenPercent
}

/** Drafts that still need to leave this phone (not editing, not sent). */
export function isUnsent(d: Draft): boolean {
  return d.state === 'queued' || d.state === 'unknown' || d.state === 'stale'
}

// ---------- decision before sending ----------

export type SendDecision =
  | { kind: 'send'; percent: number }
  /** Stage already at/above the claimed %: send the photo with the current % (01 rule 4). */
  | { kind: 'stageAhead'; percent: number }
  /** Manual choice needed: «Не принято: этап уже N%». */
  | { kind: 'stale'; percent: number }

/**
 * What to do with a draft given the stage's current % on the server.
 * - Photo only never goes stale: it is sent with the current %.
 * - Nothing changed since the worker saw it: send as is.
 * - Decrease (with reason) and the stage moved: ALWAYS stale (residual Б4-М1).
 * - Increase and the stage is already ≥ claimed: photo with the current %.
 * - Increase otherwise: stale.
 */
export function decideBeforeSend(
  d: Pick<Draft, 'seenPercent' | 'newPercent'>,
  currentPercent: number,
): SendDecision {
  if (isPhotoOnly(d)) return { kind: 'send', percent: currentPercent }
  if (currentPercent === d.seenPercent) return { kind: 'send', percent: d.newPercent }
  if (isDecrease(d)) return { kind: 'stale', percent: currentPercent }
  if (currentPercent >= d.newPercent) return { kind: 'stageAhead', percent: currentPercent }
  return { kind: 'stale', percent: currentPercent }
}

/** «Было» for a new draft: the worker's own latest unsent claim on the stage, else the server %. */
export function effectiveSeenPercent(drafts: Draft[], userId: string, stageId: string, serverPercent: number): number {
  const own = drafts
    .filter((d) => d.userId === userId && d.stageId === stageId && isUnsent(d) && d.state !== 'stale')
    .sort((a, b) => b.createdAt - a.createdAt)
  return own[0]?.newPercent ?? serverPercent
}

/** Limit counts only unsent drafts and applies only offline (01 rule 7). */
export function overLimit(drafts: Draft[], userId: string, online: boolean): boolean {
  if (online) return false
  return drafts.filter((d) => d.userId === userId && (isUnsent(d) || d.state === 'editing')).length >= DRAFT_LIMIT
}

/** `editing` older than 24 h → `queued` (returns the drafts that changed). */
export function expireEditing(drafts: Draft[], now: number): Draft[] {
  return drafts
    .filter((d) => d.state === 'editing' && now - d.createdAt > EDITING_TTL_MS)
    .map((d) => ({ ...d, state: 'queued' as const }))
}

// ---------- store ----------

export interface DraftStore {
  all(): Promise<Draft[]>
  put(d: Draft): Promise<void>
  remove(draftId: string): Promise<void>
}

export function memoryStore(initial: Draft[] = []): DraftStore & { rows: Map<string, Draft> } {
  const rows = new Map(initial.map((d) => [d.draftId, d]))
  return {
    rows,
    async all() { return [...rows.values()].sort((a, b) => a.createdAt - b.createdAt) },
    async put(d) { rows.set(d.draftId, d) },
    async remove(id) { rows.delete(id) },
  }
}

const DB_NAME = 'buildproof'
const DB_STORE = 'drafts'

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1)
    req.onupgradeneeded = () => {
      if (!req.result.objectStoreNames.contains(DB_STORE)) req.result.createObjectStore(DB_STORE, { keyPath: 'draftId' })
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

function tx<T>(mode: IDBTransactionMode, run: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  return openDb().then((db) => new Promise<T>((resolve, reject) => {
    const t = db.transaction(DB_STORE, mode)
    const req = run(t.objectStore(DB_STORE))
    t.oncomplete = () => { db.close(); resolve(req.result) }
    t.onerror = () => { db.close(); reject(t.error) }
    t.onabort = () => { db.close(); reject(t.error) }
  }))
}

/** Native IndexedDB store. Falls back to memory when IndexedDB is unavailable (private mode). */
export function indexedDbStore(): DraftStore {
  if (typeof indexedDB === 'undefined') return memoryStore()
  return {
    async all() {
      const rows = await tx<Draft[]>('readonly', (s) => s.getAll() as IDBRequest<Draft[]>)
      return rows.sort((a, b) => a.createdAt - b.createdAt)
    },
    async put(d) { await tx('readwrite', (s) => s.put(d)) },
    async remove(id) { await tx('readwrite', (s) => s.delete(id)) },
  }
}

let shared: DraftStore | null = null
export function draftStore(): DraftStore {
  shared ??= indexedDbStore()
  return shared
}

/** Ask the browser not to evict drafts (01 §3.4). Never throws. */
export function requestPersistentStorage(): void {
  try { void navigator.storage?.persist?.() } catch { /* not supported */ }
}

// ---------- sending ----------

export interface DraftTransport {
  /** Stage % on the server now. Throws a classified error (see `classify`). */
  currentPercent(stageId: string): Promise<number>
  /** Upload the photo with `upsert:false`; «already exists» must resolve (success). */
  upload(path: string, photo: Blob): Promise<void>
  /** `select report_id from photos where storage_path = :path` (before a retry). */
  reportIdForPath(path: string): Promise<string | null>
  submit(stageId: string, percent: number, reason: string | null, paths: string[]): Promise<void>
  /** Map a thrown error to a DraftError. */
  classify(err: unknown): DraftError
  /**
   * Optional one-shot send (worker link): photos travel inside the request and
   * the server dedupes by `client_request_id` = draftId, so `upload` and
   * `reportIdForPath` are skipped when this is present.
   */
  submitDraft?(d: Draft, percent: number, reason: string | null): Promise<void>
}

export type SendOutcome =
  | { draftId: string; result: 'sent' }
  | { draftId: string; result: 'sentEarlier' }
  | { draftId: string; result: 'stageAhead'; percent: number }
  | { draftId: string; result: 'stale'; percent: number }
  | { draftId: string; result: 'failed'; error: DraftError }

/** Send one draft. Never deletes a draft on failure (01 §3.4 «никогда не удаляется молча»). */
export async function sendDraft(store: DraftStore, t: DraftTransport, d: Draft, now: number): Promise<SendOutcome> {
  const attempt: Draft = { ...d, attempts: d.attempts + 1, lastAttemptAt: now }
  const paths = d.photo ? [d.storagePath] : []
  try {
    if (!t.submitDraft && d.photo && d.attempts > 0 && (await t.reportIdForPath(d.storagePath))) {
      await store.remove(d.draftId)
      return { draftId: d.draftId, result: 'sentEarlier' }
    }
    const current = await t.currentPercent(d.stageId)
    const decision = decideBeforeSend(d, current)
    if (decision.kind === 'stale') {
      await store.put({ ...attempt, state: 'stale', stalePercent: decision.percent, lastError: null })
      return { draftId: d.draftId, result: 'stale', percent: decision.percent }
    }
    const reason = decision.kind === 'send' && isDecrease(d) ? d.reason : null
    if (t.submitDraft) {
      await t.submitDraft(d, decision.percent, reason)
    } else {
      if (d.photo) await t.upload(d.storagePath, d.photo)
      await t.submit(d.stageId, decision.percent, reason, paths)
    }
    await store.remove(d.draftId)
    return decision.kind === 'stageAhead'
      ? { draftId: d.draftId, result: 'stageAhead', percent: decision.percent }
      : { draftId: d.draftId, result: 'sent' }
  } catch (err) {
    const error = t.classify(err)
    await store.put({ ...attempt, state: error === 'timeout' ? 'unknown' : 'queued', lastError: error })
    return { draftId: d.draftId, result: 'failed', error }
  }
}

/**
 * Errors a retry cannot fix: the worker must change the draft (retake, reason)
 * or delete it. Such drafts are not retried automatically nor by «Отправить снова».
 */
export const PERMANENT_ERRORS: ReadonlySet<DraftError> = new Set<DraftError>([
  'forbidden', 'photo_required', 'nothing_to_report', 'invalid_photo_path', 'comment_required', 'invalid_percent',
  'photo_invalid', 'stage_not_found',
])
export function needsWorker(d: Draft): boolean {
  return d.state === 'stale' || (d.lastError !== null && PERMANENT_ERRORS.has(d.lastError))
}

/** Drafts the queue tries now: own, queued/unknown, not waiting for the worker. */
export function sendable(drafts: Draft[], userId: string): Draft[] {
  return drafts
    .filter((d) => d.userId === userId && (d.state === 'queued' || d.state === 'unknown') && !needsWorker(d))
    .sort((a, b) => a.createdAt - b.createdAt)
}

/**
 * Send all own drafts one at a time, oldest first (same-stage order kept).
 * A failure of one draft does not stop the loop (residual Б4-М2).
 * Auth failure stops it: every other draft would fail the same way.
 */
export async function flushQueue(store: DraftStore, t: DraftTransport, userId: string, now: () => number = Date.now): Promise<SendOutcome[]> {
  const out: SendOutcome[] = []
  for (const d of sendable(await store.all(), userId)) {
    const r = await sendDraft(store, t, d, now())
    out.push(r)
    if (r.result === 'failed' && r.error === 'auth') break
  }
  return out
}

/**
 * One in-flight promise per key: a second call while the first is running gets
 * the same promise (double tap on «Отправить» never sends twice).
 */
export function singleFlight<A extends { draftId: string }, R>(fn: (arg: A) => Promise<R>): (arg: A) => Promise<R> {
  const inFlight = new Map<string, Promise<R>>()
  return (arg) => {
    const running = inFlight.get(arg.draftId)
    if (running) return running
    const p = fn(arg).finally(() => inFlight.delete(arg.draftId))
    inFlight.set(arg.draftId, p)
    return p
  }
}

/** Worker chose «Отправить с новым %» on a stale draft: re-base it on the current %. */
export function resolveStale(d: Draft, newPercent: number, reason: string | null): Draft {
  const seen = d.stalePercent ?? d.seenPercent
  return {
    ...d,
    seenPercent: seen,
    newPercent,
    reason: newPercent < seen ? reason : null,
    state: 'queued',
    stalePercent: null,
    lastError: null,
  }
}

/** Delay before the next automatic retry, or null to stop (30 min after the first). */
export function nextRetryDelay(step: number, startedAt: number, now: number): number | null {
  if (now - startedAt >= RETRY_STOP_MS) return null
  return RETRY_DELAYS_MS[Math.min(step, RETRY_DELAYS_MS.length - 1)]
}

/**
 * What the camera was opened for. Set right before `input.click()` and consumed
 * once by the file handler (or cleared on cancel), so a cancelled «Переснять»
 * never makes the next «Сфотографировать» overwrite an old draft's photo.
 */
export type ShotIntent = { kind: 'new' } | { kind: 'retake'; draftId: string }

/** The draft whose photo a shot replaces, or null for a new draft. */
export function shotTarget(intent: ShotIntent | null, drafts: Draft[]): Draft | null {
  if (!intent || intent.kind !== 'retake') return null
  return drafts.find((d) => d.draftId === intent.draftId) ?? null
}
