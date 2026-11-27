import { useCallback, useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { formatDate, formatDateTimeSmart } from '../../lib/format'
import {
  DEFAULT_DAYS, LinksApiError, MAX_DAYS, clampDays, createLink, errorKey, linkState, linkUrl, listLinks, revokeLink,
} from '../../lib/linksApi'
import type { CreatedLink, LinkKind, LinkRecord } from '../../lib/linksApi'
import { Button, ConfirmDialog, Sheet, SkeletonRows, StatusChip, TextField, useOnline } from '../ui'
import type { StatusKind } from '../ui'
import { ErrorMessage } from '../ErrorMessage'

const STATE_KIND: Record<ReturnType<typeof linkState>, StatusKind> = { active: 'accepted', expired: 'outdated', revoked: 'paused' }
const codeOf = (err: unknown) => (err instanceof LinksApiError ? err.code : 'generic')

/** One link kind on the object: list, create (token shown once), revoke with confirmation. */
export function LinkSection({ kind, projectId }: { kind: LinkKind; projectId: string }) {
  const { t } = useTranslation()
  const online = useOnline()
  const [links, setLinks] = useState<LinkRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [nonce, setNonce] = useState(0)
  const [creating, setCreating] = useState(false)
  const [created, setCreated] = useState<CreatedLink | null>(null)
  const [revoking, setRevoking] = useState<LinkRecord | null>(null)
  const [revokeBusy, setRevokeBusy] = useState(false)
  const [revokeError, setRevokeError] = useState<string | null>(null)
  const [now] = useState(() => Date.now())

  const reload = useCallback(() => setNonce((n) => n + 1), [])

  useEffect(() => {
    let active = true
    // oxlint-disable-next-line react/set-state-in-effect
    setLoading(true)
    setError(null)
    listLinks(kind, projectId)
      .then((list) => { if (active) setLinks(list) })
      .catch((err: unknown) => { if (active) setError(t(errorKey(codeOf(err)))) })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [kind, projectId, nonce, t])

  async function confirmRevoke() {
    if (!revoking) return
    setRevokeBusy(true)
    setRevokeError(null)
    try {
      await revokeLink(kind, revoking.id)
      setRevoking(null)
      reload()
    } catch (err) {
      setRevokeError(t(errorKey(codeOf(err))))
    } finally {
      setRevokeBusy(false)
    }
  }

  const k = `links.${kind}`
  return (
    <section aria-labelledby={`links-${kind}-title`} className="flex flex-col gap-3" data-links={kind}>
      <h2 id={`links-${kind}-title`} className="m-0 text-h2 font-medium text-fg">{t(`${k}.title`)}</h2>
      <p className="m-0 text-body text-fg">{t(`${k}.hint`)}</p>
      <Button variant="primary" className="self-start" disabled={!online} onClick={() => setCreating(true)}>{t(`${k}.create`)}</Button>

      {loading ? (
        <SkeletonRows label={t('links.loading')} />
      ) : error ? (
        <ErrorMessage message={error} onRetry={reload} />
      ) : links.length === 0 ? (
        <p className="m-0 rounded-card border border-dashed border-line p-5 text-body text-fg">{t(`${k}.empty`)}</p>
      ) : (
        <ul className="m-0 flex flex-col gap-2 p-0">
          {links.map((link) => {
            const state = linkState(link, now)
            return (
              <li key={link.id} data-link-state={state} className="flex list-none flex-col gap-2 rounded-card border border-line p-4 lg:flex-row lg:items-center lg:justify-between">
                <div className="flex min-w-0 flex-col gap-1">
                  <p className="m-0 text-field font-medium text-fg [overflow-wrap:anywhere]">{link.display_name}</p>
                  <StatusChip kind={STATE_KIND[state]} className="self-start">{t(`links.state.${state}`)}</StatusChip>
                  <p className="m-0 text-body text-fg num-col">
                    {state === 'revoked'
                      ? t('links.revokedAt', { date: formatDate(link.revoked_at) })
                      : t(state === 'expired' ? 'links.expiredOn' : 'links.expiresOn', { date: formatDate(link.expires_at) })}
                  </p>
                  <p className="m-0 text-body text-fg num-col">
                    {link.last_used_at ? t('links.lastUsed', { when: formatDateTimeSmart(link.last_used_at) }) : t('links.neverUsed')}
                  </p>
                </div>
                {state === 'active' ? (
                  <Button variant="secondary" className="self-start lg:self-center" disabled={!online} onClick={() => { setRevokeError(null); setRevoking(link) }}>
                    {t('links.revoke')}
                  </Button>
                ) : null}
              </li>
            )
          })}
        </ul>
      )}

      <CreateLinkSheet
        kind={kind}
        projectId={projectId}
        open={creating}
        onClose={() => setCreating(false)}
        onCreated={(c) => { setCreating(false); setCreated(c); reload() }}
      />
      <CreatedLinkSheet kind={kind} created={created} onClose={() => setCreated(null)} />

      <ConfirmDialog
        open={revoking !== null}
        name={`confirm-revoke-${kind}-link`}
        title={t('links.revoke')}
        body={t(`${k}.revokeConfirm`, { name: revoking?.display_name ?? '' })}
        primaryLabel={t('links.keep')}
        onPrimary={() => setRevoking(null)}
        secondaryLabel={t('links.revoke')}
        onSecondary={() => void confirmRevoke()}
        destructive
        busy={revokeBusy}
        error={revokeError ?? undefined}
        onClose={() => setRevoking(null)}
      />
    </section>
  )
}

function CreateLinkSheet({ kind, projectId, open, onClose, onCreated }: {
  kind: LinkKind
  projectId: string
  open: boolean
  onClose: () => void
  onCreated: (c: CreatedLink) => void
}) {
  const { t } = useTranslation()
  const online = useOnline()
  const [name, setName] = useState('')
  const [days, setDays] = useState(String(DEFAULT_DAYS))
  const [busy, setBusy] = useState(false)
  const [nameError, setNameError] = useState(false)
  const [daysError, setDaysError] = useState(false)
  const [failed, setFailed] = useState<string | null>(null)
  const [wasOpen, setWasOpen] = useState(open)
  if (open !== wasOpen) {
    setWasOpen(open)
    if (open) { setName(''); setDays(String(DEFAULT_DAYS)); setNameError(false); setDaysError(false); setFailed(null) }
  }

  async function submit(e: FormEvent) {
    e.preventDefault()
    const n = name.trim()
    const d = Number(days)
    const badName = n.length < 1 || n.length > 80
    const badDays = !Number.isInteger(d) || d < 1 || d > MAX_DAYS
    setNameError(badName)
    setDaysError(badDays)
    if (badName || badDays) return
    setBusy(true)
    setFailed(null)
    try {
      onCreated(await createLink(kind, projectId, n, clampDays(d)))
    } catch (err) {
      setFailed(t(errorKey(codeOf(err))))
    } finally {
      setBusy(false)
    }
  }

  const formId = `create-${kind}-link`
  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={t(`links.${kind}.create`)}
      history
      name={formId}
      busy={busy ? 'busy-locked' : undefined}
      footer={
        <div className="flex flex-col gap-3">
          <Button type="submit" form={formId} variant="primary" block loading={busy} disabled={!online}>{t('links.createSubmit')}</Button>
          <Button variant="secondary" block disabled={busy} onClick={onClose}>{t('common.cancel')}</Button>
        </div>
      }
    >
      <form id={formId} onSubmit={(e) => void submit(e)} noValidate className="flex flex-col gap-4">
        <TextField
          label={t(`links.${kind}.nameLabel`)}
          hint={t(`links.${kind}.nameHint`)}
          value={name}
          maxLength={80}
          autoComplete="off"
          error={nameError ? t('links.error.invalid_display_name') : undefined}
          onChange={(e) => { setName(e.target.value); setNameError(false) }}
        />
        <TextField
          label={t('links.daysLabel')}
          hint={t('links.daysHint', { max: MAX_DAYS, def: DEFAULT_DAYS })}
          type="number"
          inputMode="numeric"
          min={1}
          max={MAX_DAYS}
          value={days}
          error={daysError ? t('links.error.invalid_expiry') : undefined}
          onChange={(e) => { setDays(e.target.value); setDaysError(false) }}
        />
        {failed ? <p role="alert" className="m-0 text-body font-medium text-fg">{failed}</p> : null}
      </form>
    </Sheet>
  )
}

/** The only time the token is on screen: copy or share, then it is gone (kept in memory only). */
function CreatedLinkSheet({ kind, created, onClose }: { kind: LinkKind; created: CreatedLink | null; onClose: () => void }) {
  const { t } = useTranslation()
  const [copied, setCopied] = useState<'ok' | 'failed' | null>(null)
  const [openFor, setOpenFor] = useState<string | null>(null)
  const key = created?.link_id ?? null
  if (key !== openFor) {
    setOpenFor(key)
    setCopied(null)
  }
  const url = created ? linkUrl(kind, created.token, window.location.origin) : ''
  const canShare = typeof navigator !== 'undefined' && typeof navigator.share === 'function'

  async function copy() {
    try {
      await navigator.clipboard.writeText(url)
      setCopied('ok')
    } catch {
      setCopied('failed')
    }
  }

  async function share() {
    try {
      await navigator.share({ title: t(`links.${kind}.shareTitle`), url })
    } catch { /* cancelled */ }
  }

  return (
    <Sheet
      open={created !== null}
      onClose={onClose}
      title={t('links.createdTitle')}
      history
      name={`created-${kind}-link`}
      footer={
        <div className="flex flex-col gap-3">
          <Button variant="primary" block onClick={() => void copy()}>{t('links.copy')}</Button>
          {canShare ? <Button variant="secondary" block onClick={() => void share()}>{t('links.share')}</Button> : null}
          <Button variant="secondary" block onClick={onClose}>{t('links.done')}</Button>
        </div>
      }
    >
      <div className="flex flex-col gap-3">
        <p className="m-0 text-body font-medium text-fg">{t('links.onceWarning')}</p>
        <p className="m-0 text-body text-fg">{t(`links.${kind}.createdFor`, { name: created?.display_name ?? '', date: formatDate(created?.expires_at) })}</p>
        <label className="flex flex-col gap-1.5">
          <span className="text-field text-fg">{t('links.linkLabel')}</span>
          <input
            readOnly
            value={url}
            onFocus={(e) => e.currentTarget.select()}
            className="min-h-12 w-full rounded-control border border-line-strong bg-page px-3 text-body text-fg pointer-fine:min-h-10"
          />
        </label>
        {copied ? (
          <p role="status" className="m-0 text-body font-medium text-fg">{t(copied === 'ok' ? 'links.copied' : 'links.copyFailed')}</p>
        ) : null}
      </div>
    </Sheet>
  )
}
