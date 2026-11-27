import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { Navigate, useLocation, useParams, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../hooks/useAuth'
import { useProjectAccessSettings } from '../hooks/useProjectAccessSettings'
import type { AccessRow } from '../hooks/useProjectAccessSettings'
import { supabase } from '../lib/supabaseClient'
import { hasLegalContact, isEmailGateOpen } from '../lib/emailGate'
import { RESEND_SECONDS, codeSendError, isValidEmail, secondsLeft } from '../lib/authCode'
import { ContactLines } from '../components/ContactLines'
import { Button, ConfirmDialog, NetBar, Sheet, SkeletonRows, StatusIcon, TextField, cx, useOnline } from '../components/ui'
import { ErrorMessage } from '../components/ErrorMessage'
import { MemberAccessRow } from '../components/MemberAccessRow'

const DAY = 24 * 3600e3
/** Only crew roles are offered from the company (residual М4-5). */
const KNOWN_ROLES = new Set(['worker', 'foreman'])
const INVITE_ROWS_MAX = 10
const INVITES_PER_HOUR = 20

const isSilent = (row: AccessRow, now: number) =>
  !row.lastReportAt || now - new Date(row.lastReportAt).getTime() >= 3 * DAY

/** «Люди» (03 §5.7), route /project/:id/settings, gc only. */
export function Settings() {
  const { id } = useParams<{ id: string }>()
  const { profile } = useAuth()
  const { t } = useTranslation()
  const [params] = useSearchParams()
  const { hash } = useLocation()
  const gateOpen = isEmailGateOpen()
  const focusSilent = params.get('focus') === 'silent'

  const { rows, loading, error, reload, toggleAccess } = useProjectAccessSettings(id, profile?.company_id ?? undefined, profile?.id)
  const [removing, setRemoving] = useState<AccessRow | null>(null)
  const [removeBusy, setRemoveBusy] = useState(false)
  const [removeError, setRemoveError] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)
  const [codeFor, setCodeFor] = useState<AccessRow | null>(null)
  const [now] = useState(() => Date.now())

  useEffect(() => {
    if (hash === '#invite' && !loading) document.getElementById('invite')?.scrollIntoView()
  }, [hash, loading])

  if (profile && profile.role !== 'gc') return <Navigate to={`/project/${id}`} replace />
  if (profile && !profile.company_id) return <ErrorMessage message={t('common.noCompany')} />

  const onProject = rows.filter((r) => r.hasAccess)
  const known = rows.filter((r) => !r.hasAccess && KNOWN_ROLES.has(r.role))
  const people = focusSilent
    ? [...onProject].sort((a, b) => Number(isSilent(b, now)) - Number(isSilent(a, now)))
    : onProject

  async function add(row: AccessRow) {
    await toggleAccess(row.userId, true)
    setNotice(t('known.added', { name: row.name || t('common.noName') }))
  }

  async function confirmRemove() {
    if (!removing) return
    setRemoveBusy(true)
    setRemoveError(false)
    try {
      await toggleAccess(removing.userId, false)
      setNotice(t('people.removed', { name: removing.name || t('common.noName') }))
      setRemoving(null)
    } catch {
      setRemoveError(true)
    } finally {
      setRemoveBusy(false)
    }
  }

  return (
    <section className="flex flex-col gap-6">
      <NetBar />
      {notice ? <p role="status" className="m-0 text-body font-medium text-fg">{notice}</p> : null}

      {loading ? (
        <SkeletonRows label={t('settings.loading')} />
      ) : error ? (
        <ErrorMessage message={error} onRetry={reload} />
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="flex flex-col gap-3">
            <h2 className="m-0 text-h2 font-medium text-fg">{t('people.title')}</h2>
            {people.length === 0 ? (
              <p className="m-0 rounded-card border border-dashed border-line p-5 text-body text-fg">
                {gateOpen ? t('people.emptyOpen') : hasLegalContact() ? t('people.emptyClosed') : t('people.emptyClosedNoContact')}
              </p>
            ) : (
              <ul className="m-0 flex flex-col gap-2 p-0">
                {people.map((row) => (
                  <MemberAccessRow
                    key={row.userId}
                    row={row}
                    variant="on-project"
                    silent={focusSilent && isSilent(row, now)}
                    onRemove={(r) => { setRemoveError(false); setRemoving(r) }}
                    onSendCode={gateOpen ? setCodeFor : undefined}
                    sendCodeLabel={focusSilent && isSilent(row, now) ? t('people.sendCodeAgain') : undefined}
                  />
                ))}
              </ul>
            )}
          </div>

          <div className="flex flex-col gap-6">
            {known.length > 0 ? (
              <div className="flex flex-col gap-3">
                <h2 className="m-0 text-h2 font-medium text-fg">{t('known.title')}</h2>
                <p className="m-0 text-body text-fg">{t('known.hint')}</p>
                <ul className="m-0 flex flex-col p-0">
                  {known.map((row) => (
                    <MemberAccessRow key={row.userId} row={row} variant="in-company" onAdd={add} />
                  ))}
                </ul>
              </div>
            ) : null}

            <div id="invite" className="flex flex-col gap-3 scroll-mt-4">
              {gateOpen && id ? (
                <InviteForm projectId={id} known={known} onAddKnown={add} onInvited={reload} />
              ) : (
                <div className="flex flex-col gap-2 rounded-card border border-line bg-surface p-4">
                  <p className="m-0 text-body font-medium text-fg">{hasLegalContact() ? t('gate.inviteLater') : t('gate.inviteLaterNoContact')}</p>
                  <ContactLines label={t('common.supportLabel')} />
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={removing !== null}
        name="confirm-remove-person"
        title={t('people.remove')}
        body={t('people.removeConfirm', { name: removing?.name || t('common.noName') })}
        primaryLabel={t('people.remove')}
        onPrimary={() => void confirmRemove()}
        secondaryLabel={t('common.cancel')}
        onSecondary={() => setRemoving(null)}
        onClose={() => setRemoving(null)}
        busy={removeBusy}
        error={removeError ? t('common.unexpectedError') : undefined}
      />

      {gateOpen ? <SendCodeSheet person={codeFor} onClose={() => setCodeFor(null)} /> : null}
    </section>
  )
}

type CodeState =
  | { kind: 'idle' }
  | { kind: 'sending' }
  | { kind: 'sent'; email: string; at: number }
  | { kind: 'notOurs' }
  | { kind: 'retryAfter'; until: number }
  | { kind: 'projectLimit' }
  | { kind: 'failed' }

/** Signup-disabled answers of signInWithOtp(shouldCreateUser: false): the address has no account. */
function isUnknownAddress(err: unknown): boolean {
  const e = (err ?? {}) as { code?: string; message?: string }
  return e.code === 'otp_disabled' || e.code === 'user_not_found' || /signups not allowed|user not found/i.test(e.message ?? '')
}

/** «Отправить код входа» (03 §5.8). The owner picked a person → explicit errors (residual Б4-М6). */
function SendCodeSheet({ person, onClose }: { person: AccessRow | null; onClose: () => void }) {
  const { t } = useTranslation()
  const online = useOnline()
  const [email, setEmail] = useState('')
  const [invalid, setInvalid] = useState(false)
  const [state, setState] = useState<CodeState>({ kind: 'idle' })
  const [openFor, setOpenFor] = useState<string | null>(null)
  const [tick, setTick] = useState(() => Date.now())

  const key = person?.userId ?? null
  if (key !== openFor) {
    setOpenFor(key)
    setEmail('')
    setInvalid(false)
    setState({ kind: 'idle' })
  }

  const until = state.kind === 'retryAfter' ? state.until : state.kind === 'sent' ? state.at + RESEND_SECONDS * 1000 : 0
  const wait = until ? secondsLeft(until - RESEND_SECONDS * 1000, tick) : 0
  useEffect(() => {
    if (wait <= 0) return
    const timer = setInterval(() => setTick(Date.now()), 1000)
    return () => clearInterval(timer)
  }, [wait])

  async function send(e: FormEvent) {
    e.preventDefault()
    const address = email.trim().toLowerCase()
    if (!isValidEmail(address)) {
      setInvalid(true)
      return
    }
    setState({ kind: 'sending' })
    const { error } = await supabase.auth.signInWithOtp({ email: address, options: { shouldCreateUser: false } })
    const at = Date.now()
    setTick(at)
    if (!error) return setState({ kind: 'sent', email: address, at })
    if (isUnknownAddress(error)) return setState({ kind: 'notOurs' })
    const kind = codeSendError(error)
    if (kind === 'retryAfter') {
      const secs = Number(/(\d+)\s*seconds?/i.exec(error.message ?? '')?.[1] ?? RESEND_SECONDS)
      return setState({ kind: 'retryAfter', until: at + secs * 1000 })
    }
    setState({ kind: kind === 'projectLimit' ? 'projectLimit' : 'failed' })
  }

  const message =
    state.kind === 'sent' ? t('auth.codeSent', { email: state.email })
      : state.kind === 'notOurs' ? t('people.emailNotOurs')
        : state.kind === 'retryAfter' && wait > 0 ? t('auth.retryAfter', { count: wait })
          : state.kind === 'projectLimit' ? t('auth.projectLimit')
            : state.kind === 'failed' ? t('auth.sendFailed') : null
  const good = state.kind === 'sent'
  const blocked = !online || state.kind === 'sending' || (wait > 0 && (state.kind === 'retryAfter' || state.kind === 'sent'))

  return (
    <Sheet
      open={person !== null}
      onClose={onClose}
      title={t('people.sendCode')}
      history
      name="send-login-code"
      footer={
        <div className="flex flex-col gap-3">
          <Button type="submit" form="send-code-form" variant="primary" block loading={state.kind === 'sending'} disabled={blocked}>
            {wait > 0 && state.kind === 'sent' ? t('auth.resendIn', { count: wait }) : t('people.sendCode')}
          </Button>
          <Button variant="secondary" block onClick={onClose}>{t('common.cancel')}</Button>
        </div>
      }
    >
      <form id="send-code-form" onSubmit={(e) => void send(e)} noValidate className="flex flex-col gap-4">
        <NetBar />
        <TextField
          label={t('people.emailFor', { name: person?.name || t('common.noName') })}
          type="email"
          autoComplete="off"
          inputMode="email"
          value={email}
          error={invalid ? t('auth.emailInvalid') : undefined}
          onChange={(e) => { setEmail(e.target.value); setInvalid(false); if (state.kind === 'notOurs' || state.kind === 'failed') setState({ kind: 'idle' }) }}
        />
        {message ? (
          <p role={good ? 'status' : 'alert'} aria-live="polite" className="m-0 flex items-start gap-2 text-body font-medium text-fg">
            <StatusIcon kind={good ? 'sent' : 'error'} className="mt-0.5" />
            <span className="num-col">{message}</span>
          </p>
        ) : null}
      </form>
    </Sheet>
  )
}

interface InviteRow { key: number; name: string; email: string; sameNameOk?: boolean; result?: string; ok?: boolean }

/** Invite form (03 §5.7 block 3–5), gate open only; POST /api/invite per row. */
function InviteForm({ projectId, known, onAddKnown, onInvited }: {
  projectId: string
  known: AccessRow[]
  onAddKnown: (row: AccessRow) => Promise<void>
  onInvited: () => void
}) {
  const { t, i18n } = useTranslation()
  const { user } = useAuth()
  const online = useOnline()
  const [role, setRole] = useState<'worker' | 'foreman'>('worker')
  const [rows, setRows] = useState<InviteRow[]>([{ key: 0, name: '', email: '' }])
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState(false)

  const filled = rows.filter((r) => !r.ok && r.name.trim() && r.email.trim())
  const ownEmail = (user?.email ?? '').toLowerCase()
  const problem = (r: InviteRow, i: number): string | null => {
    const email = r.email.trim().toLowerCase()
    if (!email) return null
    if (email === ownEmail) return t('invite.ownEmail')
    if (rows.some((o, j) => j < i && o.email.trim().toLowerCase() === email)) return t('invite.duplicate')
    return null
  }
  const sameName = (r: InviteRow) =>
    r.sameNameOk ? undefined : known.find((k) => r.name.trim() && k.name.trim().toLowerCase() === r.name.trim().toLowerCase())
  const blocked = filled.some((r) => problem(r, rows.indexOf(r)) || sameName(r))

  const patch = (key: number, p: Partial<InviteRow>) => setRows((list) => list.map((r) => (r.key === key ? { ...r, ...p } : r)))

  async function submit(e: FormEvent) {
    e.preventDefault()
    if (!filled.length || blocked) return
    setBusy(true)
    const { data } = await supabase.auth.getSession()
    const token = data.session?.access_token
    for (const r of filled) {
      const email = r.email.trim().toLowerCase()
      if (!isValidEmail(email)) { patch(r.key, { result: t('invite.invalidEmail') }); continue }
      if (r.name.trim().length > 80) { patch(r.key, { result: t('invite.invalidName') }); continue }
      try {
        const res = await fetch('/api/invite', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token ?? ''}` },
          body: JSON.stringify({ email, full_name: r.name.trim(), role, project_ids: [projectId], locale: i18n.language.slice(0, 2) }),
        })
        const body = (await res.json().catch(() => ({}))) as { error?: string }
        if (res.ok) patch(r.key, { ok: true, result: t('invite.sent', { email }) })
        else if (res.status === 409) patch(r.key, { result: t('invite.emailTaken') })
        else if (res.status === 429) patch(r.key, { result: t('invite.rateLimit', { count: INVITES_PER_HOUR }) })
        else if (body.error === 'invalid_email') patch(r.key, { result: t('invite.invalidEmail') })
        else if (body.error === 'forbidden') patch(r.key, { result: t('invite.forbidden') })
        else patch(r.key, { result: t('invite.failed') })
      } catch {
        patch(r.key, { result: t('invite.failed') })
      }
    }
    setBusy(false)
    setDone(true)
    onInvited()
  }

  return (
    <form onSubmit={(e) => void submit(e)} noValidate className="flex flex-col gap-4">
      <h2 id="invite-title" className="m-0 text-h2 font-medium text-fg">{role === 'foreman' ? t('invite.foreman') : t('invite.title')}</h2>
      <div
        role="radiogroup"
        aria-labelledby="invite-title"
        className="flex gap-2"
        onKeyDown={(e) => {
          // Radio group keys: arrows move the choice and the focus (roving tabindex).
          if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key)) return
          e.preventDefault()
          const next = role === 'worker' ? 'foreman' : 'worker'
          setRole(next)
          e.currentTarget.querySelector<HTMLButtonElement>(`[data-role="${next}"]`)?.focus()
        }}
      >
        {(['worker', 'foreman'] as const).map((r) => (
          <button
            key={r}
            type="button"
            role="radio"
            data-role={r}
            aria-checked={role === r}
            tabIndex={role === r ? 0 : -1}
            disabled={busy}
            onClick={() => setRole(r)}
            className={cx(
              'inline-flex min-h-12 flex-1 items-center justify-center rounded-control border px-4 text-field font-medium focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-focus',
              role === r ? 'border-fg bg-fg text-page' : 'border-line bg-page text-fg hover:border-line-strong hover:bg-surface-2',
            )}
          >
            {t(`roles.${r}`)}
          </button>
        ))}
      </div>
      <p className="m-0 text-body text-fg">{role === 'foreman' ? t('invite.hintForeman') : t('invite.hint')}</p>
      {rows.map((r, i) => {
        const err = problem(r, i)
        const twin = sameName(r)
        return (
          <fieldset key={r.key} disabled={busy || r.ok} className="m-0 flex flex-col gap-3 rounded-card border border-line p-4">
            <TextField label={t('invite.name')} value={r.name} onChange={(e) => patch(r.key, { name: e.target.value, sameNameOk: false, result: undefined })} />
            <TextField label={t('invite.email')} type="email" inputMode="email" autoComplete="off" value={r.email} error={err ?? undefined} onChange={(e) => patch(r.key, { email: e.target.value, result: undefined })} />
            {twin ? (
              <div className="flex flex-col gap-2">
                <p className="m-0 text-body font-medium text-fg">{t('invite.sameName', { name: twin.name })}</p>
                <div className="flex flex-wrap gap-3">
                  <Button variant="secondary" onClick={() => void onAddKnown(twin).then(() => setRows((l) => (l.length > 1 ? l.filter((x) => x.key !== r.key) : [{ key: r.key + 1, name: '', email: '' }])))}>{t('invite.sameNameYes')}</Button>
                  <Button variant="secondary" onClick={() => patch(r.key, { sameNameOk: true })}>{t('invite.sameNameNo')}</Button>
                </div>
              </div>
            ) : null}
            {r.result ? (
              <p role="status" className="m-0 flex items-start gap-2 text-body font-medium text-fg">
                <StatusIcon kind={r.ok ? 'sent' : 'error'} className="mt-0.5" />{r.result}
              </p>
            ) : null}
            {rows.length > 1 && !r.ok ? (
              <Button variant="ghost" onClick={() => setRows((l) => l.filter((x) => x.key !== r.key))} className="self-start px-3">{t('invite.removeRow')}</Button>
            ) : null}
          </fieldset>
        )
      })}
      {rows.length < INVITE_ROWS_MAX ? (
        <Button variant="secondary" disabled={busy} onClick={() => setRows((l) => [...l, { key: Math.max(...l.map((x) => x.key)) + 1, name: '', email: '' }])} className="self-start">
          {done ? t('people.inviteMore') : t('invite.addRow')}
        </Button>
      ) : null}
      <Button type="submit" variant="primary" block loading={busy} disabled={!online || !filled.length || blocked}>
        {filled.length > 1
          ? t(role === 'foreman' ? 'invite.submitForemen' : 'invite.submitWorkers', { count: filled.length })
          : t(role === 'foreman' ? 'invite.submitForeman' : 'invite.submitWorker')}
      </Button>
    </form>
  )
}
