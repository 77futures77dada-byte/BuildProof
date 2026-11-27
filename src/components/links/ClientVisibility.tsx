import { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { stageLabel } from '../../i18n/stageLabel'
import { useProjectStages } from '../../hooks/useProjectStages'
import {
  LinksApiError, errorKey, mergeVisibility, ownerClientView, readVisibility, setClientVisibility, writeVisibility,
} from '../../lib/linksApi'
import type { ClientViewData, VisibilityMap } from '../../lib/linksApi'
import { Button, Sheet, SkeletonRows, cx, useOnline } from '../ui'
import { ErrorMessage } from '../ErrorMessage'
// the owner preview renders exactly the client page component (same API, same filters)
import { ClientProjectView } from '../client/ClientProjectView'

const codeOf = (err: unknown) => (err instanceof LinksApiError ? err.code : 'generic')

/**
 * «Что видит заказчик»: per stage «показывать заказчику» + separate photo consent
 * (POST /api/client-visibility), and the owner preview (POST /api/client-view).
 * The API has no GET for visibility yet: state = preview answer + last choices on this device.
 */
export function ClientVisibility({ projectId }: { projectId: string }) {
  const { t } = useTranslation()
  const online = useOnline()
  const { stages, loading, error, reload } = useProjectStages(projectId)
  const [preview, setPreview] = useState<ClientViewData | null>(null)
  const [previewError, setPreviewError] = useState<string | null>(null)
  const [previewLoading, setPreviewLoading] = useState(true)
  const [nonce, setNonce] = useState(0)
  const [map, setMap] = useState<VisibilityMap>(() => readVisibility(projectId))
  const [busy, setBusy] = useState<string | null>(null)
  const [rowError, setRowError] = useState<{ stageId: string; message: string } | null>(null)
  const [showPreview, setShowPreview] = useState(false)

  const refresh = useCallback(() => setNonce((n) => n + 1), [])

  useEffect(() => {
    let active = true
    // oxlint-disable-next-line react/set-state-in-effect
    setPreviewLoading(true)
    setPreviewError(null)
    ownerClientView(projectId)
      .then((data) => {
        if (!active) return
        setPreview(data)
        setMap((m) => mergeVisibility(m, data))
      })
      .catch((err: unknown) => { if (active) setPreviewError(t(errorKey(codeOf(err)))) })
      .finally(() => { if (active) setPreviewLoading(false) })
    return () => { active = false }
  }, [projectId, nonce, t])

  async function change(stageId: string, visible: boolean, photos: boolean) {
    const next = { visible, photos: visible && photos }
    setBusy(stageId)
    setRowError(null)
    try {
      await setClientVisibility(projectId, stageId, next.visible, next.photos)
      setMap((m) => {
        const out = { ...m, [stageId]: next }
        writeVisibility(projectId, out)
        return out
      })
      refresh()
    } catch (err) {
      setRowError({ stageId, message: t(errorKey(codeOf(err))) })
    } finally {
      setBusy(null)
    }
  }

  const shown = new Set((preview?.stages ?? []).map((s) => s.stage_id))

  return (
    <section aria-labelledby="client-visibility-title" className="flex flex-col gap-3" data-client-visibility>
      <h2 id="client-visibility-title" className="m-0 text-h2 font-medium text-fg">{t('links.visibility.title')}</h2>
      <p className="m-0 text-body text-fg">{t('links.visibility.hint')}</p>
      <Button variant="secondary" className="self-start" disabled={!online || previewLoading || !!previewError} onClick={() => setShowPreview(true)}>
        {t('links.preview.open')}
      </Button>
      {!online ? <p className="m-0 text-body font-medium text-fg" data-offline-hint>{t('links.offline')}</p> : null}
      {previewError ? <ErrorMessage message={previewError} onRetry={refresh} /> : null}

      {loading ? (
        <SkeletonRows label={t('links.loading')} />
      ) : error ? (
        <ErrorMessage message={error} onRetry={reload} />
      ) : (
        <ul className="m-0 flex flex-col gap-2 p-0">
          {stages.map((s) => {
            const v = map[s.id] ?? { visible: false, photos: false }
            const rowBusy = busy === s.id
            const disabled = !online || busy !== null
            return (
              <li key={s.id} data-stage-visible={v.visible} className="flex list-none flex-col gap-2 rounded-card border border-line p-4">
                <p className="m-0 text-field font-medium text-fg [overflow-wrap:anywhere]">{stageLabel(s.name)}</p>
                <Check
                  label={t('links.visibility.showStage')}
                  checked={v.visible}
                  disabled={disabled}
                  onChange={(on) => void change(s.id, on, on ? v.photos : false)}
                />
                <Check
                  label={t('links.visibility.showPhotos')}
                  checked={v.visible && v.photos}
                  disabled={disabled || !v.visible}
                  onChange={(on) => void change(s.id, true, on)}
                />
                {v.visible && !previewLoading && !shown.has(s.id) ? (
                  <p className="m-0 text-body text-fg">{t('links.visibility.noConfirmed')}</p>
                ) : null}
                {rowBusy ? <p aria-live="polite" className="m-0 text-body text-fg">{t('links.visibility.saving')}</p> : null}
                {rowError?.stageId === s.id ? <p role="alert" className="m-0 text-body font-medium text-fg">{rowError.message}</p> : null}
              </li>
            )
          })}
        </ul>
      )}
      <p className="m-0 text-body text-fg">{t('links.visibility.deviceNote')}</p>

      <Sheet open={showPreview} onClose={() => setShowPreview(false)} title={t('links.preview.title')} history name="client-preview">
        {preview ? <ClientProjectView data={preview} /> : null}
      </Sheet>
    </section>
  )
}

function Check({ label, checked, disabled, onChange }: { label: string; checked: boolean; disabled: boolean; onChange: (on: boolean) => void }) {
  return (
    <label className={cx('flex min-h-12 items-center gap-3 text-body text-fg pointer-fine:min-h-10', disabled ? 'opacity-60' : 'cursor-pointer')}>
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
        className="size-6 shrink-0 accent-[var(--fg)] focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-focus"
      />
      <span>{label}</span>
    </label>
  )
}
