import { useCallback, useEffect, useState, useSyncExternalStore } from 'react'
import { draftStore, expireEditing, flushQueue, nextRetryDelay, requestPersistentStorage, sendDraft, sendable, singleFlight } from '../../lib/drafts'
import type { Draft, SendOutcome } from '../../lib/drafts'
import { supabaseDraftTransport } from '../../lib/draftTransport'

/**
 * Shared draft state for the whole tab (Today, the report sheet, sign-out
 * confirm). One flush at a time (01 §3.4 «одна попытка за раз»).
 */
interface Snapshot {
  drafts: Draft[]
  loaded: boolean
  sending: boolean
  /** Result of the last attempt per draft (for SendStateRow / banner). */
  outcomes: Record<string, SendOutcome>
}

let snap: Snapshot = { drafts: [], loaded: false, sending: false, outcomes: {} }
const listeners = new Set<() => void>()
const emit = (next: Partial<Snapshot>) => {
  snap = { ...snap, ...next }
  for (const l of listeners) l()
}
const subscribe = (l: () => void) => {
  listeners.add(l)
  return () => { listeners.delete(l) }
}

export async function reloadDrafts(): Promise<Draft[]> {
  const store = draftStore()
  let rows = await store.all().catch(() => [] as Draft[])
  const expired = expireEditing(rows, Date.now())
  if (expired.length) {
    await Promise.all(expired.map((d) => store.put(d)))
    rows = await store.all()
  }
  emit({ drafts: rows, loaded: true })
  return rows
}

export async function saveDraft(d: Draft): Promise<void> {
  await draftStore().put(d)
  await reloadDrafts()
}

export async function removeDraft(id: string): Promise<void> {
  await draftStore().remove(id)
  await reloadDrafts()
}

let running: Promise<SendOutcome[]> | null = null
export function flushDrafts(userId: string): Promise<SendOutcome[]> {
  if (running) return running
  emit({ sending: true })
  running = flushQueue(draftStore(), supabaseDraftTransport, userId)
    .then(async (out) => {
      const outcomes = { ...snap.outcomes }
      for (const o of out) outcomes[o.draftId] = o
      emit({ outcomes })
      await reloadDrafts()
      return out
    })
    .finally(() => { running = null; emit({ sending: false }) })
  return running
}

/**
 * Send one draft right away (the sheet's «Отправить»), after any running flush.
 * Single flight per draft: a double tap never submits twice.
 */
export const sendDraftNow = singleFlight(sendDraftOnce)
async function sendDraftOnce(d: Draft): Promise<SendOutcome> {
  await running?.catch(() => undefined)
  emit({ sending: true })
  const job = sendDraft(draftStore(), supabaseDraftTransport, d, Date.now())
  running = job.then((o) => [o])
  try {
    const o = await job
    emit({ outcomes: { ...snap.outcomes, [o.draftId]: o } })
    await reloadDrafts()
    return o
  } finally {
    running = null
    emit({ sending: false })
  }
}

export function useDrafts() {
  const s = useSyncExternalStore(subscribe, () => snap, () => snap)
  useEffect(() => {
    if (!snap.loaded) void reloadDrafts()
  }, [])
  return s
}

/**
 * Automatic retry while the page is open: on `online`, `focus`/`visibilitychange`
 * and a 15 / 30 / 60 s / 2 min timer; stops 30 min after it started (01 §3.4).
 */
export function useAutoRetry(userId: string | undefined) {
  const { drafts } = useDrafts()
  const pending = userId ? sendable(drafts, userId).length : 0

  // Auto-retry gave up (30 min): the banner says it no longer goes by itself.
  const [stopped, setStopped] = useState(false)
  const [cycle, setCycle] = useState(0)
  const kick = useCallback(() => {
    if (userId && sendable(snap.drafts, userId).length) void flushDrafts(userId)
  }, [userId])

  useEffect(() => { requestPersistentStorage() }, [])

  useEffect(() => {
    if (!userId || !pending) return
    const onVisible = () => { if (document.visibilityState === 'visible') kick() }
    window.addEventListener('online', kick)
    window.addEventListener('focus', kick)
    document.addEventListener('visibilitychange', onVisible)
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
  }, [userId, pending, kick, cycle])

  /** «Отправить снова»: try now and restart the 30-min retry cycle. */
  const retryNow = useCallback(() => {
    setStopped(false)
    setCycle((c) => c + 1)
    kick()
  }, [kick])

  return { retryNow, stopped: stopped && pending > 0 }
}
