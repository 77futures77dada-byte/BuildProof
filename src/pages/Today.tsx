import { useEffect, useMemo, useRef, useState } from 'react'
import type { ChangeEvent } from 'react'
import { Link, Navigate, useParams } from 'react-router-dom'
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
import { draftStoragePath, effectiveSeenPercent, isUnsent, newDraftId, overLimit, DRAFT_LIMIT } from '../lib/drafts'
import type { Draft, SendOutcome } from '../lib/drafts'
import { Spinner } from '../components/Spinner'
import { ErrorMessage } from '../components/ErrorMessage'
import { TaskCard } from '../components/TaskCard'
import { Button, NetBar, ProgressBar, Sheet, StatusChip, StatusIcon, UnsentBanner, buttonClass, useOnline } from '../components/ui'
import type { UnsentState } from '../components/ui'
import { ReportSheet } from '../components/report/ReportSheet'
import { draftErrorKey } from '../components/report/draftErrors'
import { StagePicker } from '../components/report/StagePicker'
import { flushDrafts, saveDraft, useAutoRetry, useDrafts } from '../components/report/useDrafts'

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
  const retry = useAutoRetry(user?.id)

  const camera = useRef<HTMLInputElement>(null)
  const gallery = useRef<HTMLInputElement>(null)
  const [chosenStageId, setChosenStageId] = useState<string | null>(null)
  const [sheetDraftId, setSheetDraftId] = useState<string | null>(null)
  const [retakeFor, setRetakeFor] = useState<string | null>(null)
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
  const staleDrafts = unsent.filter((d) => d.state === 'stale')
  const retryable = unsent.filter((d) => d.state !== 'stale')
  const editing = mine.filter((d) => d.state === 'editing').sort((a, b) => b.createdAt - a.createdAt)[0]
  const foreign = drafts.filter((d) => d.userId !== userId && isUnsent(d)).length
  const authStuck = unsent.filter((d) => d.lastError === 'auth').length
  const sheetDraft = drafts.find((d) => d.draftId === sheetDraftId) ?? null
  const paused = project?.status === 'paused'

  const bannerState: UnsentState | null = unsent.length === 0
    ? null
    : sending ? 'retrying'
    : retryable.length === 0 ? 'outdated'
    : retryable.every((d) => d.state === 'unknown') && !staleDrafts.length ? 'unknown'
    : retryable.some((d) => d.state === 'unknown') || staleDrafts.length ? 'mixed'
    : 'queued'
  const bannerHasMain = bannerState !== null && bannerState !== 'outdated'

  const overall = stages.stages.length
    ? Math.round(stages.stages.reduce((sum, s) => sum + s.progressPercent, 0) / stages.stages.length)
    : 0

  const openCamera = (fromGallery = false) => {
    setNotice(null)
    if (overLimit(drafts, userId, online)) { setNotice(t('send.limit', { max: DRAFT_LIMIT })); return }
    ;(fromGallery ? gallery : camera).current?.click()
  }

  const onFile = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) { setRetakeFor(null); return }
    let blob: Blob
    try { ({ blob } = await resizeImageToJpeg(file)) } catch { setNotice(t('photos.prepareFailed')); setRetakeFor(null); return }
    const existing = retakeFor ? drafts.find((d) => d.draftId === retakeFor) : undefined
    setRetakeFor(null)
    if (existing) {
      await saveDraft({ ...existing, photo: blob })
      setSheetDraftId(existing.draftId)
      return
    }
    const stage = defaultStage
    if (!stage) return
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
          detail={bannerState === 'unknown' ? t('send.unknownHint') : t('send.queued')}
          retryStatus={[
            t('send.lastPhoto', { time: formatDateTimeSmart(new Date(lastShot).toISOString()) }),
            lastTry ? t('send.lastAttempt', { time: formatDateTimeSmart(new Date(lastTry).toISOString()) }) : null,
          ].filter(Boolean).join(' · ')}
          retryLabel={t('send.resend')}
          onRetry={retry}
          details={
            <div className="flex flex-col gap-2">
              {bannerState === 'unknown' ? (
                <Button variant="primary" block onClick={() => void flushDrafts(userId)}>{t('send.unknownAction')}</Button>
              ) : null}
              <Button variant="ghost" aria-expanded={showDetails} onClick={() => setShowDetails((v) => !v)} className="self-start px-3">
                {t('send.details')}
              </Button>
              {showDetails ? (
                <ul className="m-0 flex list-none flex-col gap-2 p-0" data-unsent-items>
                  {unsent.map((d) => (
                    <li key={d.draftId}>
                      {d.state === 'stale' ? (
                        <button type="button" onClick={() => setSheetDraftId(d.draftId)} className="min-h-12 text-left text-body font-semibold text-fg underline underline-offset-4">
                          {t('send.itemReason', { stage: d.stageName, reason: itemReason(d) })}
                        </button>
                      ) : (
                        <p className="m-0 text-body font-semibold">{t('send.itemReason', { stage: d.stageName, reason: itemReason(d) })}</p>
                      )}
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

      {staleDrafts.length ? (
        <Button variant="secondary" onClick={() => setSheetDraftId(staleDrafts[0].draftId)} className="self-start">
          <StatusIcon kind="stale" />{t('today.staleWaiting', { count: staleDrafts.length })}
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
            <p className="m-0 truncate text-field font-semibold" data-today-stage>{t('report.stage', { stage: defaultStage?.name ?? '' })}</p>
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
        onRetake={() => { if (sheetDraft) { setRetakeFor(sheetDraft.draftId); camera.current?.click() } }}
        onDone={onDone}
      />
    </div>
  )
}
