import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { RefObject } from 'react'
import { Link, Navigate, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { stageLabel } from '../i18n/stageLabel'
import { useAuth } from '../hooks/useAuth'
import { usePrefersReducedMotion } from '../hooks/usePrefersReducedMotion'
import { supabase } from '../lib/supabaseClient'
import { resolvePhotoUrls } from '../lib/storage'
import { withTimeout } from '../lib/withTimeout'
import { UNDO_WINDOW_MS, isReportReviewOn } from '../lib/reportReview'
import { LanguageSwitcher } from '../components/LanguageSwitcher'
import { Spinner } from '../components/Spinner'
import { ErrorMessage } from '../components/ErrorMessage'
import { Button, FilterChips, NetBar, PhotoViewer, Sheet, StatusChip, UndoBar, buttonClass, cx, useOnline } from '../components/ui'

/** K15 queue item: a `pending` stage_reports row (docs/contracts/reports.md §2). */
interface QueueItem {
  id: string
  projectId: string
  projectName: string
  stageName: string
  reporterId: string
  reporterName: string | null
  from: number
  to: number
  createdAt: string
  photoUrl: string | null
}

type RowState = { kind: 'ready' } | { kind: 'confirmed'; at: number } | { kind: 'sending' } | { kind: 'collapsing' } | { kind: 'failed' }

const REASONS = ['tooHigh', 'unclear', 'wrongStage'] as const
const CLOSED_EARLY_KEY = 'buildproof.review.closedEarly'
const COLLAPSE_MS = 250

function readClosedEarly(): Set<string> {
  try { return new Set(JSON.parse(sessionStorage.getItem(CLOSED_EARLY_KEY) ?? '[]') as string[]) } catch { return new Set() }
}
function writeClosedEarly(ids: Set<string>) {
  try { sessionStorage.setItem(CLOSED_EARLY_KEY, JSON.stringify([...ids])) } catch { /* private mode */ }
}

async function loadQueue(): Promise<QueueItem[]> {
  const { data, error } = await supabase
    .from('stage_reports')
    .select('id, project_id, reporter_id, previous_confirmed_percent, claimed_percent, created_at, projects(name), project_stages(stage_templates(name)), photos(storage_path)')
    .eq('status', 'pending')
    .order('created_at', { ascending: true })
  if (error) throw error
  type Row = {
    id: string; project_id: string; reporter_id: string; previous_confirmed_percent: number; claimed_percent: number; created_at: string
    projects: { name: string } | null
    project_stages: { stage_templates: { name: string } | null } | null
    photos: { storage_path: string }[] | null
  }
  const rows = (data ?? []) as unknown as Row[]
  const ids = [...new Set(rows.map((r) => r.reporter_id))]
  const names = new Map<string, string | null>()
  if (ids.length) {
    const res = await supabase.from('profiles').select('id, full_name').in('id', ids)
    for (const p of (res.data ?? []) as { id: string; full_name: string | null }[]) names.set(p.id, p.full_name)
  }
  const paths = rows.map((r) => r.photos?.[0]?.storage_path).filter((p): p is string => !!p)
  const urls = paths.length ? await resolvePhotoUrls(paths) : new Map<string, string>()
  return rows.map((r) => ({
    id: r.id,
    projectId: r.project_id,
    projectName: r.projects?.name ?? '',
    stageName: r.project_stages?.stage_templates?.name ?? '',
    reporterId: r.reporter_id,
    reporterName: names.get(r.reporter_id) ?? null,
    from: r.previous_confirmed_percent,
    to: r.claimed_percent,
    createdAt: r.created_at,
    photoUrl: r.photos?.[0]?.storage_path ? (urls.get(r.photos[0].storage_path) ?? null) : null,
  }))
}

/** `review_stage_report` over fetch, so it also works with `keepalive` on pagehide. */
function sendDecision(token: string | null, id: string, decision: 'confirm' | 'reject', note: string | null, keepalive = false) {
  return fetch(`${import.meta.env.VITE_SUPABASE_URL}/rest/v1/rpc/review_stage_report`, {
    method: 'POST',
    keepalive,
    headers: {
      'Content-Type': 'application/json',
      apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
      Authorization: `Bearer ${token ?? import.meta.env.VITE_SUPABASE_ANON_KEY}`,
    },
    body: JSON.stringify({ p_report_id: id, p_decision: decision, p_note: note }),
  }).then((res) => { if (!res.ok) throw new Error(`review ${res.status}`) })
}

function waitedHours(iso: string, now: number): number {
  return Math.max(1, Math.round((now - new Date(iso).getTime()) / 3600e3))
}

/** /review (03 §4.7), only with K15 on. */
export function Review() {
  const { profile } = useAuth()
  if (!isReportReviewOn()) return <Navigate to="/dashboard" replace />
  if (profile && profile.role !== 'gc' && profile.role !== 'foreman') return <Navigate to="/dashboard" replace />
  return <ReviewQueue myId={profile?.id ?? null} />
}

function ReviewQueue({ myId }: { myId: string | null }) {
  const { t } = useTranslation()
  const online = useOnline()
  const reduced = usePrefersReducedMotion()
  const [params, setParams] = useSearchParams()
  const [items, setItems] = useState<QueueItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [nonce, setNonce] = useState(0)
  const [states, setStates] = useState<Record<string, RowState>>({})
  const [loaded, setLoaded] = useState<Set<string>>(new Set())
  const [broken, setBroken] = useState<Set<string>>(new Set())
  const [closedEarly, setClosedEarly] = useState<Set<string>>(() => readClosedEarly())
  const [returning, setReturning] = useState<QueueItem | null>(null)
  const [viewing, setViewing] = useState<QueueItem | null>(null)
  const [now, setNow] = useState(() => Date.now())

  const token = useRef<string | null>(null)
  const touching = useRef(false)
  const statesRef = useRef(states)
  useEffect(() => { statesRef.current = states })
  // N on the undo bar updates only after the finger leaves the screen (03 §4.7, r2-Q7).
  const [shownCount, setShownCount] = useState(0)
  const [touchDown, setTouchDown] = useState(false)

  useEffect(() => {
    void supabase.auth.getSession().then(({ data }) => { token.current = data.session?.access_token ?? null })
  }, [])

  useEffect(() => {
    let active = true
    // oxlint-disable-next-line react/set-state-in-effect
    setLoading(true)
    setError(null)
    withTimeout(loadQueue())
      .then((list) => { if (active) setItems(list) })
      .catch(() => { if (active) setError(t('common.unexpectedError')) })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [nonce, t])

  const pendingIds = useCallback(
    () => Object.entries(statesRef.current).filter(([, s]) => s.kind === 'confirmed').map(([id]) => id),
    [],
  )
  const countNow = Object.values(states).filter((s) => s.kind === 'confirmed').length
  if (!touchDown && shownCount !== countNow) setShownCount(countNow)

  const remove = useCallback((id: string) => {
    setStates((s) => { const n = { ...s }; delete n[id]; return n })
    setItems((list) => list.filter((x) => x.id !== id))
  }, [])

  // After its 7 s window a confirmation is sent; the row then leaves (animated only when no finger is down).
  const finish = useCallback((id: string) => {
    sendDecision(token.current, id, 'confirm', null)
      .then(() => {
        const leave = () => {
          if (touching.current) { setTimeout(leave, 150); return }
          if (reduced) { remove(id); return }
          setStates((s) => ({ ...s, [id]: { kind: 'collapsing' } }))
          setTimeout(() => remove(id), COLLAPSE_MS)
        }
        leave()
      })
      .catch(() => setStates((s) => ({ ...s, [id]: { kind: 'failed' } })))
  }, [reduced, remove])

  useEffect(() => {
    const confirmed = Object.entries(states).filter(([, s]) => s.kind === 'confirmed') as [string, { kind: 'confirmed'; at: number }][]
    if (!confirmed.length) return
    const next = Math.min(...confirmed.map(([, s]) => s.at + UNDO_WINDOW_MS))
    const timer = setTimeout(() => {
      const at = Date.now()
      setNow(at)
      for (const [id, s] of confirmed) {
        if (s.at + UNDO_WINDOW_MS <= at) {
          setStates((cur) => ({ ...cur, [id]: { kind: 'sending' } }))
          finish(id)
        }
      }
    }, Math.max(0, next - Date.now()))
    return () => clearTimeout(timer)
  }, [states, finish])

  // Leaving the screen ends every window at once (03 §4.7): send with keepalive.
  useEffect(() => {
    const flush = () => {
      const ids = pendingIds()
      if (!ids.length) return
      const early = readClosedEarly()
      // Sent early: the row is no longer `confirmed`, so the 7 s timer never sends it again.
      const sendingNow = Object.fromEntries(ids.map((id) => [id, { kind: 'sending' } as RowState]))
      statesRef.current = { ...statesRef.current, ...sendingNow }
      setStates((cur) => ({ ...cur, ...sendingNow }))
      for (const id of ids) {
        early.add(id)
        void sendDecision(token.current, id, 'confirm', null, true).then(() => {
          const cur = readClosedEarly(); cur.delete(id); writeClosedEarly(cur)
          remove(id)
        }).catch(() => setStates((cur) => ({ ...cur, [id]: { kind: 'failed' } })))
      }
      writeClosedEarly(early)
    }
    const onVisibility = () => { if (document.visibilityState === 'hidden') flush() }
    document.addEventListener('visibilitychange', onVisibility)
    window.addEventListener('pagehide', flush)
    return () => {
      document.removeEventListener('visibilitychange', onVisibility)
      window.removeEventListener('pagehide', flush)
      flush()
    }
  }, [pendingIds, remove])

  useEffect(() => {
    const down = () => { touching.current = true; setTouchDown(true) }
    const up = () => { touching.current = false; setTouchDown(false) }
    window.addEventListener('pointerdown', down)
    window.addEventListener('pointerup', up)
    window.addEventListener('pointercancel', up)
    return () => {
      window.removeEventListener('pointerdown', down)
      window.removeEventListener('pointerup', up)
      window.removeEventListener('pointercancel', up)
    }
  }, [])

  function confirm(item: QueueItem) {
    if (closedEarly.has(item.id)) {
      const next = new Set(closedEarly); next.delete(item.id); setClosedEarly(next); writeClosedEarly(next)
    }
    setStates((s) => ({ ...s, [item.id]: { kind: 'confirmed', at: Date.now() } }))
  }

  function undoAll() {
    setStates((s) => Object.fromEntries(Object.entries(s).filter(([, v]) => v.kind !== 'confirmed')))
  }

  const projects = useMemo(() => [...new Map(items.map((i) => [i.projectId, i.projectName])).entries()], [items])
  const filter = params.get('project') ?? 'all'
  const visible = items.filter((i) => filter === 'all' || i.projectId === filter)
  const topId = visible.find((i) => (states[i.id]?.kind ?? 'ready') === 'ready' && i.reporterId !== myId)?.id

  return (
    <div className="min-h-dvh bg-page text-fg">
      <header className="border-b-2 border-line">
        <div className="mx-auto flex max-w-[720px] items-center justify-between gap-3 px-4 py-1">
          <Link to="/dashboard" className={buttonClass({ variant: 'ghost' }, 'px-3')}>{t('notFound.toProjects')}</Link>
          <LanguageSwitcher />
        </div>
      </header>
      <main className="mx-auto flex max-w-[720px] flex-col gap-4 px-4 py-4">
        <UndoBar count={shownCount} label={t('review.undoN', { count: shownCount })} onUndo={undoAll} />
        <NetBar />
        <h1 className="m-0 text-h1 font-semibold">{t('review.title')}</h1>

        {projects.length > 1 ? (
          <FilterChips
            label={t('review.title')}
            selected={filter}
            onSelect={(id) => setParams(id === 'all' ? {} : { project: id }, { replace: true })}
            chips={[{ id: 'all', label: t('photos.allStages') }, ...projects.map(([id, name]) => ({ id, label: name }))]}
          />
        ) : null}

        {loading ? (
          <Spinner label={t('common.loadingEllipsis')} />
        ) : error ? (
          <ErrorMessage message={error} onRetry={() => setNonce((n) => n + 1)} />
        ) : visible.length === 0 ? (
          <div className="flex flex-col items-start gap-3 rounded-card border-2 border-dashed border-line p-5">
            <p className="m-0 text-field font-medium">{t('review.empty')}</p>
            <Link to="/dashboard" className={buttonClass({ variant: 'secondary' })}>{t('notFound.toProjects')}</Link>
          </div>
        ) : (
          <ul className="m-0 flex flex-col gap-3 p-0">
            {visible.map((item) => {
              const state = states[item.id] ?? { kind: 'ready' }
              const own = item.reporterId === myId
              const ready = loaded.has(item.id) || !item.photoUrl
              return (
                <li
                  key={item.id}
                  data-review-row={state.kind}
                  className={cx(
                    'grid list-none overflow-hidden transition-[grid-template-rows,opacity] duration-[250ms] motion-reduce:transition-none',
                    state.kind === 'collapsing' ? 'grid-rows-[0fr] opacity-0' : 'grid-rows-[1fr]',
                  )}
                >
                  <div className="min-h-0">
                    <div className="flex min-h-[120px] flex-col gap-3 rounded-card border-2 border-line p-3">
                      <div className="flex gap-3">
                        <button
                          type="button"
                          onClick={() => setViewing(item)}
                          aria-label={t('photos.viewer')}
                          className="size-24 shrink-0 overflow-hidden rounded-control bg-surface focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-focus"
                        >
                          {item.photoUrl ? (
                            <img
                              src={item.photoUrl}
                              alt=""
                              onLoad={() => setLoaded((s) => new Set(s).add(item.id))}
                              // a broken/slow link must not lock «Подтвердить» forever: say why, allow confirming
                              onError={() => { setLoaded((s) => new Set(s).add(item.id)); setBroken((s) => new Set(s).add(item.id)) }}
                              className="block size-full object-cover"
                            />
                          ) : null}
                        </button>
                        <div className="flex min-w-0 flex-col gap-1">
                          <p className="m-0 text-field font-medium [overflow-wrap:anywhere]">
                            {[item.reporterName ?? t('common.noName'), stageLabel(item.stageName)].join(' · ')}
                          </p>
                          <p className="m-0 text-field font-medium num-col">{t('review.wasClaimed', { from: item.from, to: item.to })}</p>
                          <p className="m-0 text-body font-medium num-col">{t('review.waiting', { count: waitedHours(item.createdAt, now) })}</p>
                        </div>
                      </div>
                      {broken.has(item.id) ? <p className="m-0 text-body font-medium">{t('photos.imageFailed')}</p> : null}
                      {!ready && !own ? <p aria-live="polite" className="m-0 text-body font-medium">{t('review.photoLoading')}</p> : null}
                      {closedEarly.has(item.id) && state.kind === 'ready' ? (
                        <p className="m-0 text-body font-medium">{t('review.closedEarly')}</p>
                      ) : null}
                      {own ? (
                        <p className="m-0 text-body font-medium">{t('review.ownJump')}</p>
                      ) : state.kind === 'confirmed' || state.kind === 'sending' || state.kind === 'collapsing' ? (
                        <StatusChip kind="verified" className="self-start">{t('review.confirmedRow')}</StatusChip>
                      ) : (
                        <>
                          {state.kind === 'failed' ? <p role="alert" className="m-0 text-body font-medium">{t('common.unexpectedError')}</p> : null}
                          <div className="flex justify-between gap-4">
                            <Button
                              variant={item.id === topId ? 'primary' : 'secondary'}
                              size="md"
                              disabled={!ready || !online}
                              onClick={() => confirm(item)}
                            >
                              {t('review.confirm')}
                            </Button>
                            <Button variant="secondary" disabled={!online} onClick={() => setReturning(item)}>{t('review.return')}</Button>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </main>

      <ReturnSheet item={returning} onClose={() => setReturning(null)} onSent={(id) => { setReturning(null); remove(id) }} token={token} />

      <PhotoViewer
        open={viewing !== null}
        onClose={() => setViewing(null)}
        title={t('photos.viewer')}
        src={viewing?.photoUrl ?? null}
        alt={viewing ? stageLabel(viewing.stageName) : ''}
        failedLabel={t('photos.imageFailed')}
        caption={viewing ? [viewing.reporterName, stageLabel(viewing.stageName), viewing.projectName].filter(Boolean).join(' · ') : null}
      />
    </div>
  )
}

/** review-return-reason (03 §4.8): reasons by one tap, main «Вернуть с этой причиной», «Отмена». */
function ReturnSheet({ item, onClose, onSent, token }: {
  item: QueueItem | null
  onClose: () => void
  onSent: (id: string) => void
  token: RefObject<string | null>
}) {
  const { t } = useTranslation()
  const [reason, setReason] = useState<(typeof REASONS)[number] | null>(null)
  const [busy, setBusy] = useState(false)
  const [failed, setFailed] = useState(false)
  const [openFor, setOpenFor] = useState<string | null>(null)
  if ((item?.id ?? null) !== openFor) {
    setOpenFor(item?.id ?? null)
    setReason(null)
    setFailed(false)
  }

  async function send() {
    if (!item || !reason) return
    setBusy(true)
    setFailed(false)
    try {
      await sendDecision(token.current, item.id, 'reject', t(`review.returnReason.${reason}`))
      onSent(item.id)
    } catch {
      setFailed(true)
    } finally {
      setBusy(false)
    }
  }

  return (
    <Sheet
      open={item !== null}
      onClose={onClose}
      title={t('review.return')}
      history
      name="review-return-reason"
      busy={busy ? 'busy-locked' : undefined}
      footer={
        <div className="flex flex-col gap-3">
          <Button variant="primary" block loading={busy} disabled={!reason} onClick={() => void send()}>{t('review.returnSend')}</Button>
          <Button variant="secondary" block disabled={busy} onClick={onClose}>{t('common.cancel')}</Button>
        </div>
      }
    >
      <div role="radiogroup" aria-label={t('review.return')} className="flex flex-col gap-3">
        {REASONS.map((r) => (
          <button
            key={r}
            type="button"
            role="radio"
            aria-checked={reason === r}
            onClick={() => setReason(r)}
            className={cx(
              'inline-flex min-h-12 items-center rounded-control border-2 px-4 text-left text-field font-medium',
              'focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-focus',
              reason === r ? 'border-fg bg-fg text-page' : 'border-line bg-page text-fg',
            )}
          >
            {t(`review.returnReason.${r}`)}
          </button>
        ))}
        {failed ? <p role="alert" className="m-0 text-body font-medium">{t('common.unexpectedError')}</p> : null}
      </div>
    </Sheet>
  )
}
