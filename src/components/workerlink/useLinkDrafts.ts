import { useCallback, useEffect, useMemo, useState, useSyncExternalStore } from 'react'
import { draftStore, flushQueue, nextRetryDelay, requestPersistentStorage, sendDraft, sendable, singleFlight } from '../../lib/drafts'
import type { Draft, DraftTransport, SendOutcome } from '../../lib/drafts'
import { workerLinkTransport } from '../../lib/linkTransport'

/**
 * Draft queue of the worker-link page. Same IndexedDB store and queue rules as
 * the signed-in app (src/lib/drafts.ts); drafts are owned by the link's
 * device-local id (never the token) and sent with the link transport.
 */
interface Snapshot {
  drafts: Draft[]
  loaded: boolean
  /** Draft ids being sent right now. */
  inFlight: string[]
  outcomes: Record<string, SendOutcome>
}

let snap: Snapshot = { drafts: [], loaded: false, inFlight: [], outcomes: {} }
const listeners = new Set<() => void>()
const emit = (next: Partial<Snapshot>) => {
  snap = { ...snap, ...next }
  for (const l of listeners) l()
}
const subscribe = (l: () => void) => {
  listeners.add(l)
  return () => { listeners.delete(l) }
}

async function reload(): Promise<void> {
  const rows = await draftStore().all().catch(() => [] as Draft[])
  emit({ drafts: rows, loaded: true })
}

export async function saveLinkDraft(d: Draft): Promise<void> {
  await draftStore().put(d)
  await reload()
}

export async function removeLinkDraft(id: string): Promise<void> {
  await draftStore().remove(id)
  await reload()
}

let running: Promise<unknown> | null = null
const mark = (ids: string[], on: boolean) =>
  emit({ inFlight: on ? [...new Set([...snap.inFlight, ...ids])] : snap.inFlight.filter((x) => !ids.includes(x)) })
const record = (out: SendOutcome[]) => {
  const outcomes = { ...snap.outcomes }
  for (const o of out) outcomes[o.draftId] = o
  emit({ outcomes })
}

function flush(t: DraftTransport, owner: string): Promise<unknown> {
  if (running) return running
  const ids = sendable(snap.drafts, owner).map((d) => d.draftId)
  mark(ids, true)
  running = flushQueue(draftStore(), t, owner)
    .then(async (out) => { record(out); await reload() })
    .finally(() => { running = null; mark(ids, false) })
  return running
}

const sendOne = singleFlight(async (arg: { draftId: string; d: Draft; t: DraftTransport }): Promise<SendOutcome> => {
  await running?.catch(() => undefined)
  mark([arg.draftId], true)
  const job = sendDraft(draftStore(), arg.t, arg.d, Date.now())
  running = job
  try {
    const o = await job
    record([o])
    await reload()
    return o
  } finally {
    running = null
    mark([arg.draftId], false)
  }
})

/** Drafts of this link on this phone, plus send/retry controls. */
export function useLinkDrafts(token: string, owner: string) {
  const s = useSyncExternalStore(subscribe, () => snap, () => snap)
  const transport = useMemo(() => workerLinkTransport(token), [token])
  useEffect(() => { if (!snap.loaded) void reload() }, [])
  useEffect(() => { requestPersistentStorage() }, [])

  const mine = useMemo(() => s.drafts.filter((d) => d.userId === owner && d.state !== 'sent'), [s.drafts, owner])
  const pending = sendable(mine, owner).length

  const sendNow = useCallback((d: Draft) => sendOne({ draftId: d.draftId, d, t: transport }), [transport])
  const kick = useCallback(() => {
    if (sendable(snap.drafts, owner).length) void flush(transport, owner)
  }, [transport, owner])

  // Retry while the page is open: on `online`, focus, and 15 s / 30 s / 1 min / 2 min; stop after 30 min.
  const [stopped, setStopped] = useState(false)
  const [cycle, setCycle] = useState(0)
  useEffect(() => {
    if (!pending) return
    const onVisible = () => { if (document.visibilityState === 'visible') kick() }
    window.addEventListener('online', kick)
    window.addEventListener('focus', kick)
    document.addEventListener('visibilitychange', onVisible)
    // oxlint-disable-next-line react/set-state-in-effect
    setStopped(false)
    const started = Date.now()
    let step = 0
    let timer: ReturnType<typeof setTimeout> | undefined
    const schedule = () => {
      const delay = nextRetryDelay(step, started, Date.now())
      if (delay === null) { setStopped(true); return }
      timer = setTimeout(() => { step += 1; kick(); schedule() }, delay)
    }
    schedule()
    return () => {
      window.removeEventListener('online', kick)
      window.removeEventListener('focus', kick)
      document.removeEventListener('visibilitychange', onVisible)
      if (timer) clearTimeout(timer)
    }
  }, [pending, kick, cycle])

  const retryNow = useCallback(() => { setStopped(false); setCycle((c) => c + 1); kick() }, [kick])

  return { drafts: mine, inFlight: s.inFlight, outcomes: s.outcomes, loaded: s.loaded, sendNow, retryNow, stopped: stopped && pending > 0 }
}
