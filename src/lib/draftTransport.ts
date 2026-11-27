import { supabase } from './supabaseClient'
import { PHOTOS_BUCKET } from './storage'
import type { DraftError, DraftTransport } from './drafts'

/** No answer within 20 s = `unknown` (01 §3.4). */
const ANSWER_MS = 20_000

class TimeoutError extends Error {
  constructor() { super('timeout'); this.name = 'TimeoutError' }
}

function timed<T>(p: PromiseLike<T>): Promise<T> {
  let timer: ReturnType<typeof setTimeout>
  return Promise.race([
    Promise.resolve(p),
    new Promise<never>((_, reject) => { timer = setTimeout(() => reject(new TimeoutError()), ANSWER_MS) }),
  ]).finally(() => clearTimeout(timer))
}

const RPC_CODES: [string, DraftError][] = [
  ['authentication_required', 'auth'],
  ['forbidden', 'forbidden'],
  ['photo_required_for_progress', 'photo_required'],
  ['nothing_to_report', 'nothing_to_report'],
  ['invalid_photo_path', 'invalid_photo_path'],
  ['comment_required_for_decrease', 'comment_required'],
  ['invalid_percent', 'invalid_percent'],
]

/** Map any thrown value (Supabase error, fetch TypeError, timeout) to a DraftError. */
export function classifyDraftError(err: unknown): DraftError {
  if (err instanceof TimeoutError) return 'timeout'
  if (typeof navigator !== 'undefined' && navigator.onLine === false) return 'network'
  const e = err as { message?: string; status?: number; statusCode?: string | number; name?: string } | null
  const msg = `${e?.message ?? ''}`
  for (const [code, out] of RPC_CODES) if (msg.includes(code)) return out
  if (e?.status === 401 || String(e?.statusCode) === '401' || /JWT/i.test(msg)) return 'auth'
  if (err instanceof TypeError || /fetch|network|Failed to fetch|Load failed/i.test(msg)) return 'network'
  return 'other'
}

/** Supabase transport for the draft queue (submit_stage_report, upsert:false upload). */
export const supabaseDraftTransport: DraftTransport = {
  async currentPercent(stageId) {
    const { data, error } = await timed(
      supabase.from('project_stages').select('progress_percent').eq('id', stageId).single(),
    )
    if (error) throw error
    return (data as { progress_percent: number }).progress_percent
  },
  async upload(path, photo) {
    const { error } = await timed(
      supabase.storage.from(PHOTOS_BUCKET).upload(path, photo, { contentType: 'image/jpeg', upsert: false }),
    )
    // «already exists» = an earlier attempt uploaded it: success (01 §3.4).
    if (error && !/exist|duplicate|409/i.test(`${error.message} ${(error as { statusCode?: string }).statusCode ?? ''}`)) throw error
  },
  async reportIdForPath(path) {
    const { data, error } = await timed(
      supabase.from('photos').select('report_id').eq('storage_path', path).limit(1),
    )
    if (error) throw error
    const row = (data as { report_id: string | null }[] | null)?.[0]
    return row?.report_id ?? null
  },
  async submit(stageId, percent, reason, paths) {
    const { error } = await timed(
      supabase.rpc('submit_stage_report', {
        p_project_stage_id: stageId,
        p_new_percent: percent,
        p_comment: reason,
        p_photo_paths: paths,
      }),
    )
    if (error) throw error
  },
  classify: classifyDraftError,
}
