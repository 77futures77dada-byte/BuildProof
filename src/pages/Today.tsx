import { useEffect, useMemo, useRef, useState } from 'react'
import type { ChangeEvent } from 'react'
import { Link, Navigate, useParams, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../hooks/useAuth'
import { useTasks } from '../hooks/useTasks'
import type { TaskItem } from '../hooks/useTasks'
import { useProjectStages } from '../hooks/useProjectStages'
import type { EditableStage } from '../hooks/useProjectStages'
import { useProject } from '../hooks/useProject'
import { supabase } from '../lib/supabaseClient'
import { resizeImageToJpeg } from '../lib/image'
import { formatDate, formatDateTimeSmart } from '../lib/format'
import { draftStoragePath, effectiveSeenPercent, isUnsent, needsWorker, newDraftId, overLimit, shotTarget, DRAFT_LIMIT } from '../lib/drafts'
import type { Draft, SendOutcome, ShotIntent } from '../lib/drafts'
import { Spinner } from '../components/Spinner'
import { ErrorMessage } from '../components/ErrorMessage'
import { TaskCard } from '../components/TaskCard'
import { Button, NetBar, ProgressBar, Sheet, StatusChip, StatusIcon, UnsentBanner, buttonClass, useOnline } from '../components/ui'
import type { UnsentState } from '../components/ui'
import { ReportSheet } from '../components/report/ReportSheet'
import { draftErrorKey } from '../components/report/draftErrors'
import { StagePicker } from '../components/report/StagePicker'
import { removeDraft, saveDraft, useAutoRetry, useDrafts } from '../components/report/useDrafts'
import { DraftThumb } from '../components/report/DraftThumb'
import { stageFromParam } from '../components/report/stageParam'

/** In-progress first, then by deadline (soonest first, no-deadline last). */
function byUrgency(a: TaskItem, b: TaskItem): number {
  if (a.status !== b.status) return a.status === 'in_progress' ? -1 : 1
  if (a.deadline && b.deadline) return a.deadline.localeCompare(b.deadline)
  if (a.deadline) return -1
  if (b.deadline) return 1
  return 0
}

const lastStageKey = (projectId: string) => `bp:lastStage:${projectId}`
function readLastStage(projectId: string): string | null {
  try { return localStorage.getItem(lastStageKey(projectId)) } catch { return null }
}
function writeLastStage(projectId: string, stageId: string) {
  try { localStorage.setItem(lastStageKey(projectId), stageId) } catch { /* private mode */ }
}

interface LastReport { project_stage_id: string; created_at: string }

/**
 * Worker «Сегодня» (03 §6.1): camera first, then the report sheet; drafts in
 * IndexedDB with an «не отправлено» banner that names the reason per draft.
 */
export function Today() {
  const { id } = useParams<{ id: string }>()
  const { user, profile } = useAuth()
  const { t } = useTranslation()
  const stages = useProjectStages(id)
  const { project } = useProject(id)
  const { tasks, loading, error, reload, updateTask } = useTasks(id, user?.id)
  const { drafts, sending } = useDrafts()
  const online = useOnline()
  const { retryNow, stopped: retryStopped } = useAutoRetry(user?.id)

  const camera = useRef<HTMLInputElement>(null)
  const gallery = useRef<HTMLInputElement>(null)
  const [chosenStageId, setChosenStageId] = useState<string | null>(null)
  // «Отметить» on «Этапы» → ?stage=<id>: preselect it for the next shot, then drop the param.
  const [params, setParams] = useSearchParams()
  const stageParam = params.get('stage')
  if (stageParam && !stages.loading) {
    const picked = stageFromParam(stageParam, stages.stages)
    if (picked && picked !== chosenStageId) setChosenStageId(picked)
  }
  useEffect(() => {
    if (!stageParam || stages.loading) return
    const next = new URLSearchParams(params)
    next.delete('stage')
    setParams(next, { replace: true })
  }, [stageParam, stages.loading, params, setParams])
  const [sheetDraftId, setSheetDraftId] = useState<string | null>(null)
  // What the camera is open for; set right before click(), consumed once (critic r1 HIGH-2).
  const shot = useRef<ShotIntent | null>(null)

  // A cancelled camera fires `cancel` (no `change`): forget the intent.
  useEffect(() => {
    const inputs = [camera.current, gallery.current]
    const onCancel = () => { shot.current = null }
    for (const el of inputs) el?.addEventListener('cancel', onCancel)
    return () => { for (const el of inputs) el?.removeEventListener('cancel', onCancel) }
  })
  const [picker, setPicker] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)
  const [result, setResult] = useState<string | null>(null)
  const [lastReport, setLastReport] = useState<LastReport | null>(null)
  const [showDetails, setShowDetails] = useState(false)

  useEffect(() => {
    if (!id || !user?.id) return
    let active = true
    void supabase
      .from('stage_reports')
      .select('project_stage_id, created_at')
      .eq('project_id', id)
      .eq('reporter_id', user.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .then(({ data }) => { if (active) setLastReport(((data ?? []) as LastReport[])[0] ?? null) }, () => undefined)
    return () => { active = false }
  }, [id, user?.id, result])

  const active = tasks.filter((x) => x.status !== 'done').sort(byUrgency)
  const doneCount = tasks.length - active.length

  // Default stage: task in progress → last own report / pick → first unfinished (03 §6.1).
  const defaultStage: EditableStage | null = useMemo(() => {
    const list = stages.stages
    const byId = (sid: string | null | undefined) => (sid ? list.find((s) => s.id === sid) : undefined)
    return (
      byId(chosenStageId) ??
      byId(active.find((x) => x.status === 'in_progress')?.projectStageId) ??
      byId(lastReport?.project_stage_id) ??
      byId(id ? readLastStage(id) : null) ??
      list.find((s) => s.progressPercent < 100) ??
      list[0] ??
      null
    )
  }, [stages.stages, chosenStageId, active, lastReport, id])

  // Only workers have this tab; anyone else lands on the overview.
  if (profile && profile.role !== 'worker') return <Navigate to={`/project/${id}`} replace />
  if (!id || !user) return null
  const userId = user.id

  const mine = drafts.filter((d) => d.userId === userId && d.projectId === id)
  const unsent = mine.filter(isUnsent)
  // stale or an error a retry cannot fix: waits for the worker (open → fix or delete)
  const waiting = unsent.filter(needsWorker)
  const retryable = unsent.filter((d) => !needsWorker(d))
  const editing = mine.filter((d) => d.state === 'editing').sort((a, b) => b.createdAt - a.createdAt)[0]
  const foreign = drafts.filter((d) => d.userId !== userId && isUnsent(d)).length
  const authStuck = unsent.filter((d) => d.lastError === 'auth').length
  const sheetDraft = drafts.find((d) => d.draftId === sheetDraftId) ?? null
  const paused = project?.status === 'paused'

  const bannerState: UnsentState | null = unsent.length === 0
    ? null
    : sending ? 'retrying'
    : retryable.length === 0 ? 'outdated'
    : retryable.every((d) => d.state === 'unknown') && !waiting.length ? 'unknown'
    : retryable.some((d) => d.state === 'unknown') || waiting.length ? 'mixed'
    : 'queued'
  const bannerHasMain = bannerState !== null && bannerState !== 'outdated'

  const overall = stages.stages.length
    ? Math.round(stages.stages.reduce((sum, s) => sum + s.progressPercent, 0) / stages.stages.length)
    : 0

  const openCamera = (fromGallery = false) => {
    setNotice(null)
    if (overLimit(drafts, userId, online)) { setNotice(t('send.limit', { max: DRAFT_LIMIT })); return }
    shot.current = { kind: 'new' }
    ;(fromGallery ? gallery : camera).current?.click()
  }

  const retake = (draftId: string) => {
    shot.current = { kind: 'retake', draftId }
    camera.current?.click()
  }

  const onFile = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    const intent = shot.current
    shot.current = null
    if (!file) return
    let blob: Blob
    try { ({ blob } = await resizeImageToJpeg(file)) } catch { setNotice(t('photos.prepareFailed')); return }
    const existing = shotTarget(intent, drafts)
    if (existing) {
      if (existing.attempts === 0) {
        await saveDraft({ ...existing, photo: blob, lastError: null })
        setSheetDraftId(existing.draftId)
        return
      }
      // An earlier attempt may have uploaded the old photo at this path: new id, new path.
      const fresh = newDraftId()
      await saveDraft({
        ...existing, draftId: fresh, photo: blob, storagePath: draftStoragePath(existing.projectId, existing.stageId, fresh),
        attempts: 0, lastAttemptAt: null, lastError: null,
      })
      await removeDraft(existing.draftId)
      setSheetDraftId(fresh)
      return
    }
    const stage = defaultStage
    if (!stage) { setNotice(stages.stages.length ? t('errors.generic') : t('stages.emptyAsk')); return }
    const draftId = newDraftId()
    const seen = effectiveSeenPercent(drafts, userId, stage.id, stage.progressPercent)
    // saved right after the shot, before the sheet opens (01 §3.4 rule 1)
    await saveDraft({
      draftId, userId, projectId: id, stageId: stage.id, stageName: stage.name,
      seenPercent: seen, newPercent: seen, reason: null, photo: blob,
      storagePath: draftStoragePath(id, stage.id, draftId), state: 'editing',
      createdAt: Date.now(), attempts: 0, lastAttemptAt: null, lastError: null, stalePercent: null,
    })
    writeLastStage(id, stage.id)
    setResult(null)
    setSheetDraftId(draftId)
  }

  const onDone = (o: SendOutcome) => {
    setSheetDraftId(null)
    if (o.result === 'sent') setResult(t('send.sent'))
    else if (o.result === 'sentEarlier') setResult(t('send.sentEarlier'))
    else if (o.result === 'stageAhead') setResult(t('send.stageAhead', { percent: o.percent }))
    else setResult(null)
  }

  const itemReason = (d: Draft) =>
    d.state === 'stale'
      ? t('send.stale', { percent: d.stalePercent ?? 0 })
      : t(draftErrorKey(d.lastError ?? (d.state === 'unknown' ? 'timeout' : 'network')))
  const lastShot = Math.max(...unsent.map((d) => d.createdAt))
  const lastTry = Math.max(0, ...unsent.map((d) => d.lastAttemptAt ?? 0))

  return (
    <div className="flex flex-col gap-5 text-fg">
      <NetBar />

      {bannerState ? (
        <UnsentBanner
          state={bannerState}
          count={unsent.length}
          countLabel=""
          title={bannerState === 'unknown' ? t('send.unknown') : t('send.bar', { count: unsent.length })}
          detail={bannerState === 'unknown' ? t('send.unknownHintToday') : t('send.queuedToday')}
          retryStatus={[
            retryStopped ? t('send.retryStopped') : null,
            t('send.lastPhoto', { time: formatDateTimeSmart(new Date(lastShot).toISOString()) }),
            lastTry ? t('send.lastAttempt', { time: formatDateTimeSmart(new Date(lastTry).toISOString()) }) : null,
          ].filter(Boolean).join(' · ')}
          retryLabel={t('send.resend')}
          onRetry={retryNow}
          details={
            <div className="flex flex-col gap-2">
              {bannerState === 'unknown' ? (
                <Button variant="primary" block onClick={retryNow}>{t('send.unknownAction')}</Button>
              ) : null}
              <Button variant="ghost" aria-expanded={showDetails} onClick={() => setShowDetails((v) => !v)} className="self-start px-3">
                {t('send.details')}
              </Button>
              {showDetails ? (
                <ul className="m-0 flex list-none flex-col gap-2 p-0" data-unsent-items>
                  {unsent.map((d) => (
                    <li key={d.draftId}>
                      {/* every row opens the sheet: fix, resend or delete from the phone (critic r1 HIGH-3) */}
                      <button type="button" onClick={() => setSheetDraftId(d.draftId)} className="flex min-h-12 w-full items-center gap-3 text-left text-body font-semibold text-fg underline underline-offset-4 focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-focus">
                        <DraftThumb photo={d.photo} />
                        <span className="min-w-0 [overflow-wrap:anywhere]">{t('send.itemReason', { stage: d.stageName, reason: itemReason(d) })}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
          }
        />
      ) : null}

      {authStuck ? (
        <p className="m-0 flex flex-wrap items-center gap-3 text-field font-semibold">
          {t('errors.authRequiredDrafts', { count: authStuck })}
          <Link to="/login" className={buttonClass({ variant: 'secondary' })}>{t('common.signIn')}</Link>
        </p>
      ) : null}

      {waiting.length ? (
        <Button variant="secondary" onClick={() => setSheetDraftId(waiting[0].draftId)} className="self-start">
          <StatusIcon kind="stale" />{t('today.needsAttention', { count: waiting.length })}
        </Button>
      ) : null}

      {editing ? (
        <section className="flex items-center gap-3 rounded-card border-2 border-line bg-surface p-3">
          <p className="m-0 min-w-0 flex-1 text-field font-semibold">{t('report.unfinished')}</p>
          <Button variant="secondary" onClick={() => setSheetDraftId(editing.draftId)}>{t('today.continue')}</Button>
        </section>
      ) : null}

      {result ? (
        <p aria-live="polite" data-send-state="sent" className="m-0 flex items-center gap-2 text-field font-semibold">
          <StatusIcon kind="sent" />{result}
        </p>
      ) : null}

      <section className="flex flex-col gap-3">
        {stages.loading ? (
          <Spinner label={t('today.loadingProgress')} />
        ) : stages.error ? (
          <ErrorMessage message={stages.error} onRetry={stages.reload} />
        ) : stages.stages.length === 0 ? (
          <p className="m-0 text-field font-semibold">{t('stages.emptyAsk')}</p>
        ) : (
          <>
            {paused ? <p className="m-0 flex items-center gap-2 text-field font-semibold"><StatusIcon kind="paused" />{t('report.paused')}</p> : null}
            <p className="m-0 line-clamp-2 text-field font-semibold [overflow-wrap:anywhere]" data-today-stage>{t('report.stage', { stage: defaultStage?.name ?? '' })}</p>
            <Button variant={bannerHasMain ? 'secondary' : 'primary'} size="main" block onClick={() => openCamera()}>
              {t('today.report')}
            </Button>
            <div className="flex flex-wrap gap-3">
              <Button variant="secondary" onClick={() => openCamera(true)}>{t('today.fromGallery')}</Button>
              <Button variant="secondary" onClick={() => setPicker(true)}>{t('today.otherStage')}</Button>
            </div>
            {notice ? <p role="alert" className="m-0 text-field font-semibold">{notice}</p> : null}
          </>
        )}
        <input ref={camera} type="file" accept="image/*" capture="environment" hidden onChange={(e) => void onFile(e)} />
        <input ref={gallery} type="file" accept="image/*" hidden onChange={(e) => void onFile(e)} />
      </section>

      {!stages.loading && !stages.error && stages.stages.length ? (
        <section className="flex flex-col gap-2">
          <p className="m-0 text-h3 font-bold">{t('today.objectPercent', { percent: overall })}</p>
          <ProgressBar value={overall} thickness="thick" label={t('today.objectPercent', { percent: overall })} />
        </section>
      ) : null}

      <section className="flex flex-col gap-3">
        <h2 className="m-0 text-h2 font-bold">{t('today.myTasks')}</h2>
        {loading ? (
          <Spinner label={t('tasks.loading')} />
        ) : error ? (
          <ErrorMessage message={error} onRetry={reload} />
        ) : active.length === 0 ? (
          <p className="m-0 rounded-card border-2 border-line bg-surface p-4 text-field font-medium">
            {doneCount > 0 ? t('today.allDone') : t('today.noTasks')}
          </p>
        ) : (
          <ul className="m-0 flex list-none flex-col gap-3 p-0">
            {active.map((task) => (
              <TaskCard
                key={task.id}
                task={task}
                variant="worker"
                members={[]}
                stages={[]}
                onUpdate={updateTask}
                onCompletedWithStage={(x) => { setChosenStageId(x.projectStageId); openCamera() }}
              />
            ))}
          </ul>
        )}
        {!loading && !error && doneCount > 0 ? (
          <p className="m-0 text-body font-semibold">{t('today.doneCount', { count: doneCount })}</p>
        ) : null}
      </section>

      {lastReport ? (
        <section className="flex flex-col items-start gap-2">
          <p className="m-0 text-field font-semibold">
            {t('today.lastReport', {
              stage: stages.stages.find((s) => s.id === lastReport.project_stage_id)?.name ?? '',
              date: formatDate(lastReport.created_at),
            })}
          </p>
          <StatusChip kind="sent">{t('status.markedByCrew')}</StatusChip>
        </section>
      ) : null}

      {foreign ? <p className="m-0 text-field font-semibold">{t('send.others', { count: foreign })}</p> : null}

      <Sheet open={picker} onClose={() => setPicker(false)} title={t('stagePicker.title')} history name="stage-picker">
        <StagePicker
          stages={stages.stages}
          currentId={defaultStage?.id ?? null}
          onPick={(s) => {
            setChosenStageId(s.id)
            setPicker(false)
            openCamera() // same tap: picking a stage opens the camera (03 §6.3)
          }}
        />
      </Sheet>

      <ReportSheet
        draft={sheetDraft}
        stages={stages.stages}
        projectName={project?.name ?? ''}
        userId={userId}
        paused={paused}
        onClose={() => setSheetDraftId(null)}
        onRetake={() => { if (sheetDraft) retake(sheetDraft.draftId) }}
        onDone={onDone}
      />
    </div>
  )
}
