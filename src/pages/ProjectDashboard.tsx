import { useState } from 'react'
import type { ReactNode } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { stageLabel } from '../i18n/stageLabel'
import { useAuth } from '../hooks/useAuth'
import { useProjectOverview } from '../hooks/useProjectOverview'
import type { ActiveIssue, FeedEntry, OverviewPhoto, ProjectOverview, StageProgress } from '../hooks/useProjectOverview'
import { useProjectAccessSettings } from '../hooks/useProjectAccessSettings'
import type { AccessRow } from '../hooks/useProjectAccessSettings'
import type { UserRole } from '../types'
import { formatDate, formatDateTimeSmart, toErrorMessage } from '../lib/format'
import { daysSince, freshnessView, isGateOpen, lastActivityAt, STALE_DAYS } from '../lib/freshness'
import { updateStageProgress } from '../lib/stages'
import { issueBorder } from '../lib/issues'
import { Button, Disclosure, FreshnessChip, ProgressBar, Sheet, Skeleton, StageRow, buttonClass } from '../components/ui'
import { ErrorMessage } from '../components/ErrorMessage'
import { Modal } from '../components/Modal'
import { PhotoUploadForm } from '../components/PhotoUploadForm'
import { TaskForm } from '../components/TaskForm'
import { IssueForm } from '../components/IssueForm'
import { StageActionButtons } from '../components/StageActionButtons'
import type { StageActionCapabilities, StageActionKind } from '../components/StageActionButtons'
import { StageProgressControl } from '../components/StageProgressControl'
import { HouseModelBlock } from '../features/house3d/HouseModelBlock'
import { UrgentBadge } from '../components/UrgentBadge'

function capabilitiesFor(role: UserRole | undefined): StageActionCapabilities {
  const manager = role === 'gc' || role === 'foreman'
  return {
    // Owner/foreman mark without a photo (brief §2.3 В1); everyone on site adds
    // a photo or raises a problem; only gc/foreman create tasks.
    mark: manager,
    photo: manager || role === 'worker',
    task: manager,
    issue: manager || role === 'worker',
  }
}

export function ProjectDashboard() {
  const { id } = useParams<{ id: string }>()
  const { profile, user } = useAuth()
  const { data, loading, error, reload } = useProjectOverview(id)
  const { t } = useTranslation()

  if (loading && !data) {
    return (
      <div role="status" aria-label={t('overview.loading')} className="flex flex-col gap-4">
        <Skeleton variant="card" />
        <Skeleton variant="row" />
        <Skeleton variant="row" />
        <Skeleton variant="row" />
      </div>
    )
  }

  if (error || !data) {
    return <ErrorMessage message={error ?? t('overview.loadFailed')} onRetry={reload} />
  }

  return (
    <ProjectDashboardView
      data={data}
      projectId={id ?? ''}
      role={profile?.role}
      userId={user?.id}
      companyId={profile?.company_id ?? undefined}
      onChanged={reload}
    />
  )
}

type MainAction =
  | { kind: 'mark'; label: string }
  | { kind: 'link'; label: string; to: string }
  | { kind: 'none' }

interface StageAction {
  kind: Exclude<StageActionKind, 'mark'>
  stageId: string
  stageName: string
}

function Section({ title, children, more }: { title: string; children: ReactNode; more?: ReactNode }) {
  return (
    <section className="flex flex-col gap-3">
      <h2 className="m-0 text-h2 font-bold text-fg">{title}</h2>
      {children}
      {more}
    </section>
  )
}

export function ProjectDashboardView({
  data,
  projectId,
  role,
  userId,
  companyId,
  onChanged,
}: {
  data: ProjectOverview
  projectId: string
  role?: UserRole
  userId?: string
  companyId?: string
  onChanged?: () => void
}) {
  const { t } = useTranslation()
  const { project, overallPercent, stages, photos, activeIssues, feed } = data
  const isGc = role === 'gc'
  const isManager = isGc || role === 'foreman'
  const gateOpen = isGateOpen()

  // People of the company and who is on this project (owner/foreman only).
  const access = useProjectAccessSettings(isManager ? projectId : undefined, isManager ? companyId : undefined, userId)
  const crew = access.rows.filter((r) => r.role === 'worker' || r.role === 'foreman')
  const onProject = crew.filter((r) => r.hasAccess)
  const known = crew.filter((r) => !r.hasAccess)

  const capabilities = capabilitiesFor(role)
  const [action, setAction] = useState<StageAction | null>(null)
  const [markStageId, setMarkStageId] = useState<string | null>(null)

  const status = project.status
  const stagesExist = stages.length > 0
  const day0 = !data.lastWorkerReportAt && !data.lastMarkAt && !data.hasStageHistory && photos.length === 0
  const freshInput = {
    status,
    lastWorkerReportAt: data.lastWorkerReportAt,
    lastMarkAt: data.lastMarkAt,
    lastMarkRole: data.lastMarkRole,
    peopleNames: onProject.map((p) => p.name),
    createdAt: (project as typeof project & { created_at?: string | null }).created_at ?? null,
  }
  const fresh = freshnessView(freshInput, t, { gateOpen, fmt: formatDate })
  const lastAt = lastActivityAt(freshInput)
  const stale = (daysSince(lastAt) ?? 0) >= STALE_DAYS
  const hasPeople = onProject.length > 0
  const targetStage =
    stages.find((s) => s.id === data.lastChangedStageId && s.progressPercent < 100) ??
    stages.find((s) => s.progressPercent < 100) ??
    stages[0]

  // 03 §5.1: first matching row wins, exactly one main action. k15 rows are off in this build.
  function mainAction(): { main: MainAction; line?: string; secondary?: ReactNode } {
    const mark: MainAction = { kind: 'mark', label: t('overview.markStage') }
    if (status !== 'active' || !stagesExist || !isManager) return { main: { kind: 'none' } }
    if (day0) {
      if (gateOpen && isGc) return { main: { kind: 'link', label: t('overview.next.inviteOpen'), to: `/project/${projectId}/settings#invite` } }
      return {
        main: { kind: 'mark', label: t('overview.next.action') },
        line: gateOpen ? undefined : t('gate.inviteLater'),
      }
    }
    if (stale && gateOpen && hasPeople) {
      if (isGc) return { main: { kind: 'link', label: t('overview.openPeople'), to: `/project/${projectId}/settings?focus=silent` } }
      // Foreman: the reproach line plus something to do (stage 5 critic «Март» MED 5).
      return { main: mark, line: t('overview.staleForeman', { names: onProject.map((p) => p.name).join(', ') }) }
    }
    if (stale && !gateOpen && isGc && known.length + onProject.length > 0) {
      return {
        main: mark,
        secondary: <Link to={`/project/${projectId}/settings`} className={buttonClass({ variant: 'secondary' })}>{t('people.all')}</Link>,
      }
    }
    if (data.lastWorkerReportAt && data.lastEntryBy && data.lastEntryBy !== userId) {
      // PhotoViewer is not built yet; the latest report is the newest photo on «Фото».
      return { main: { kind: 'link', label: t('overview.openLastReport'), to: `/project/${projectId}/photos` } }
    }
    return { main: mark }
  }

  const { main, line, secondary } = mainAction()
  const markStage = stages.find((s) => s.id === markStageId) ?? null

  function closeAction() {
    setAction(null)
  }
  function completeAction() {
    setAction(null)
    onChanged?.()
  }
  function onStageAction(stage: StageProgress, kind: StageActionKind) {
    if (kind === 'mark') setMarkStageId(stage.id)
    else setAction({ kind, stageId: stage.id, stageName: stage.name })
  }

  const stateCard = (
    <section className="flex flex-col gap-3 rounded-card border-2 border-line bg-surface p-4 shadow-card">
      <p className="m-0 text-figure font-bold">{t('overview.readyPercent', { percent: overallPercent })}</p>
      <ProgressBar value={overallPercent} thickness="thick" label={t('overview.readiness')} />
      {isManager ? (
        <FreshnessChip icon={fresh.icon} className="self-start">{fresh.label}</FreshnessChip>
      ) : lastAt ? (
        <p className="m-0 text-body font-medium">{t('overview.updatedAt', { date: formatDate(lastAt) })}</p>
      ) : null}
      {!stagesExist ? (
        <p className="m-0 text-field font-semibold">{isGc ? t('stages.emptyOwner') : t('stages.emptyAsk')}</p>
      ) : status === 'paused' && !isManager ? (
        <p className="m-0 text-field font-semibold">{t('overview.clientPaused')}</p>
      ) : day0 && !isManager ? (
        <p className="m-0 text-field font-semibold">{t('overview.notStartedReadOnly')}</p>
      ) : null}
      {line ? <p className="m-0 text-body font-semibold">{line}</p> : null}
      {main.kind === 'mark' ? (
        <Button block onClick={() => setMarkStageId(targetStage?.id ?? null)}>{main.label}</Button>
      ) : main.kind === 'link' ? (
        <Link to={main.to} data-main="" className={buttonClass({ variant: 'primary', block: true })}>{main.label}</Link>
      ) : null}
      {secondary}
    </section>
  )

  const stagesBlock = stagesExist ? (
    <Section title={t('overview.stages')}>
      <ul className="m-0 flex flex-col p-0">
        {stages.map((stage) => (
          <StageRow
            key={stage.id}
            variant={isManager ? 'overview' : 'readonly'}
            name={stageLabel(stage.name)}
            percent={stage.progressPercent}
            onPress={isManager && status === 'active' ? () => setMarkStageId(stage.id) : undefined}
            meta={stage.lastChangeAt ? formatDateTimeSmart(stage.lastChangeAt) : undefined}
            actions={
              status === 'active' && (capabilities.photo || capabilities.task || capabilities.issue) && isManager ? (
                <StageActionButtons
                  stageName={stageLabel(stage.name)}
                  capabilities={capabilities}
                  onAction={(kind) => onStageAction(stage, kind)}
                />
              ) : undefined
            }
          >
            <MarkedChip stage={stage} />
          </StageRow>
        ))}
      </ul>
    </Section>
  ) : null

  const feedBlock = isManager ? (
    <Section title={t('overview.feedTitle')}>
      {feed.length === 0 ? (
        <p className="m-0 text-body font-medium">{t('overview.feedEmpty')}</p>
      ) : (
        <>
          <FeedList entries={feed.slice(0, 3)} />
          {feed.length > 3 ? (
            <Disclosure label={t('overview.feedAll')}>
              <FeedList entries={feed.slice(3)} />
            </Disclosure>
          ) : null}
        </>
      )}
    </Section>
  ) : null

  const knownBlock = isGc && known.length > 0 ? (
    <KnownPeople
      rows={known}
      onAdd={async (row) => {
        await access.toggleAccess(row.userId, true)
      }}
      allTo={`/project/${projectId}/settings`}
    />
  ) : null

  const photosBlock = photos.length > 0 ? (
    <Section
      title={t('overview.recentPhotos')}
      more={<Link to={`/project/${projectId}/photos`} className={buttonClass({ variant: 'ghost' }, 'self-start px-1')}>{t('overview.allPhotos')}</Link>}
    >
      <ul className="m-0 grid list-none grid-cols-3 gap-2 p-0">
        {photos.slice(0, 3).map((photo) => <PhotoTile key={photo.id} photo={photo} />)}
      </ul>
    </Section>
  ) : null

  const issuesBlock = (
    <Section
      title={t('overview.activeIssues')}
      more={
        activeIssues.length > 3 ? (
          <Link to={`/project/${projectId}/issues`} className={buttonClass({ variant: 'ghost' }, 'self-start px-1')}>{t('overview.allIssues')}</Link>
        ) : undefined
      }
    >
      {activeIssues.length === 0 ? (
        <p className="m-0 text-body font-medium">{t('overview.noActiveIssues')}</p>
      ) : (
        <ul className="m-0 flex list-none flex-col gap-2 p-0">
          {activeIssues.slice(0, 3).map((issue) => <IssueRow key={issue.id} issue={issue} />)}
        </ul>
      )}
    </Section>
  )

  // Desktop only: on a phone the stage list already answers «where is the work» (critic «Март» MED 8).
  const houseBlock = stagesExist ? (
    <div className="hidden lg:block">
    <Disclosure label={t('overview.showHouse')}>
      <HouseModelBlock
        stages={stages.map((stage) => ({
          key: stage.id,
          name: stage.name,
          percent: stage.progressPercent,
          sortOrder: stage.sortOrder,
        }))}
      />
    </Disclosure>
    </div>
  ) : null

  return (
    <div className="flex flex-col gap-8 lg:grid lg:grid-cols-12 lg:items-start lg:gap-8">
      <div className="flex min-w-0 flex-col gap-8 lg:col-span-7">
        {stateCard}
        {stagesBlock}
        {feedBlock}
      </div>
      <div className="flex min-w-0 flex-col gap-8 lg:col-span-5">
        {knownBlock}
        {issuesBlock}
        {photosBlock}
        {houseBlock}
      </div>

      <Sheet
        open={markStage !== null}
        onClose={() => {
          setMarkStageId(null)
          onChanged?.()
        }}
        title={markStage ? stageLabel(markStage.name) : t('overview.markStage')}
      >
        {markStage ? (
          <StageProgressControl
            value={markStage.progressPercent}
            label={stageLabel(markStage.name)}
            onCommit={(percent) => updateStageProgress(markStage.id, percent)}
          />
        ) : null}
      </Sheet>

      <Modal
        open={action !== null}
        onClose={closeAction}
        label={
          action?.kind === 'photo'
            ? t('overview.addPhoto')
            : action?.kind === 'task'
              ? t('overview.createTask')
              : t('overview.reportIssue')
        }
      >
        {action?.kind === 'photo' ? (
          <PhotoUploadForm
            projectId={projectId}
            fixedStageId={action.stageId}
            heading={t('overview.photoHeading', { stage: stageLabel(action.stageName) })}
            onUploaded={completeAction}
            onCancel={closeAction}
          />
        ) : null}
        {action?.kind === 'task' ? (
          <TaskForm projectId={projectId} defaultStageId={action.stageId} onCreated={completeAction} onCancel={closeAction} />
        ) : null}
        {action?.kind === 'issue' ? (
          <IssueForm projectId={projectId} onCreated={completeAction} onCancel={closeAction} />
        ) : null}
      </Modal>
    </div>
  )
}

/** Until K15 the only report status is who marked it (residual И4-М2): no «Принято / Ждёт проверки / Проверено». */
function MarkedChip({ stage }: { stage: StageProgress }) {
  const { t } = useTranslation()
  if (!stage.lastChangeAt) return null
  const key =
    stage.lastChangeRole === 'gc'
      ? 'status.markedByOwner'
      : stage.lastChangeRole === 'foreman'
        ? 'status.markedByForeman'
        : 'status.markedByCrew'
  return <FreshnessChip className="self-start">{t(key)}</FreshnessChip>
}

function FeedList({ entries }: { entries: FeedEntry[] }) {
  const { t } = useTranslation()
  return (
    <ul className="m-0 flex list-none flex-col gap-3 p-0">
      {entries.map((e) => {
        const name = e.name ?? t('common.noName')
        const stage = stageLabel(e.stage)
        return (
          <li key={`${e.kind}-${e.id}`} className="flex flex-col gap-1 border-b-2 border-line pb-3 last:border-b-0">
            <span className="text-body font-semibold [overflow-wrap:anywhere]">
              {e.kind === 'report'
                ? t('activity.report', { name, stage, from: e.from, to: e.to })
                : t('activity.photo', { name, stage })}
            </span>
            <span className="num-col text-body font-medium">{formatDateTimeSmart(e.at)}</span>
          </li>
        )
      })}
    </ul>
  )
}

function KnownPeople({ rows, onAdd, allTo }: { rows: AccessRow[]; onAdd: (row: AccessRow) => Promise<void>; allTo: string }) {
  const { t } = useTranslation()
  const [busy, setBusy] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  return (
    <Section
      title={t('known.title')}
      more={<Link to={allTo} className={buttonClass({ variant: 'ghost' }, 'self-start px-1')}>{t('people.all')}</Link>}
    >
      <p className="m-0 text-body font-medium">{t('known.hint')}</p>
      <ul className="m-0 flex list-none flex-col gap-3 p-0">
        {rows.slice(0, 3).map((row) => (
          <li key={row.userId} className="flex flex-wrap items-center justify-between gap-3 rounded-control border-2 border-line p-3">
            <span className="min-w-0 text-field font-semibold [overflow-wrap:anywhere]">
              {row.name} · {t(`roles.${row.role}`)}
            </span>
            <Button
              variant="secondary"
              loading={busy === row.userId}
              onClick={async () => {
                setBusy(row.userId)
                setError(null)
                try {
                  await onAdd(row)
                  setMessage(t('known.added', { name: row.name }))
                } catch (err) {
                  setError(`${t('known.addFailed')} ${toErrorMessage(err)}`)
                } finally {
                  setBusy(null)
                }
              }}
            >
              {t('known.add')}
            </Button>
          </li>
        ))}
      </ul>
      <p aria-live="polite" className="m-0 text-body font-semibold empty:hidden">{message}</p>
      <ErrorMessage message={error} />
    </Section>
  )
}

function PhotoTile({ photo }: { photo: OverviewPhoto }) {
  const { t } = useTranslation()
  return (
    <li>
      {photo.url ? (
        <img
          src={photo.url}
          alt={photo.caption ?? t('common.projectPhoto')}
          loading="lazy"
          className="aspect-square w-full rounded-control object-cover"
        />
      ) : (
        <div className="flex aspect-square w-full items-center justify-center rounded-control bg-surface p-2 text-center text-body font-medium">
          {t('common.noPreview')}
        </div>
      )}
    </li>
  )
}

function IssueRow({ issue }: { issue: ActiveIssue }) {
  const { t } = useTranslation()
  const { id } = useParams<{ id: string }>()
  return (
    <li>
      <Link
        to={`/project/${id}/issues`}
        className={`flex min-h-12 items-start justify-between gap-3 rounded-control border-2 border-l-4 border-line bg-page p-3 text-fg no-underline hover:bg-surface focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-focus ${issueBorder(issue.priority)}`}
      >
        <span className="flex min-w-0 flex-col gap-1">
          <span className="text-field font-semibold [overflow-wrap:anywhere]">{issue.title}</span>
          {issue.dueDate ? <span className="text-body font-medium">{t('common.due', { date: formatDate(issue.dueDate) })}</span> : null}
        </span>
        <UrgentBadge priority={issue.priority} />
      </Link>
    </li>
  )
}
