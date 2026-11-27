import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from './ui'

interface ImagePickerProps {
  /** Fires with the chosen file, or null when cleared. */
  onChange: (file: File | null) => void
  disabled?: boolean
  /** Already chosen file (e.g. straight from the camera); shown as the preview. */
  initialFile?: File | null
  /** Open the rear camera instead of the gallery (`capture="environment"`). */
  camera?: boolean
}

/**
 * File input + preview for one image. Owns the preview object URL (revoked on
 * replace and unmount). Shared by the photo form and the issue form. Reset it
 * by remounting (a changing `key`).
 */
export function ImagePicker({ onChange, disabled, initialFile = null, camera }: ImagePickerProps) {
  const { t } = useTranslation()
  const inputRef = useRef<HTMLInputElement>(null)
  const [file, setFile] = useState<File | null>(initialFile)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)

  useEffect(() => {
    if (!file) return
    const url = URL.createObjectURL(file)
    // The preview URL belongs to this file; revoked when the file changes.
    // oxlint-disable-next-line react/set-state-in-effect
    setPreviewUrl(url)
    return () => {
      URL.revokeObjectURL(url)
      setPreviewUrl(null)
    }
  }, [file])

  function pick(next: File | null) {
    setFile(next)
    onChange(next)
  }

  return (
    <div className="flex flex-col gap-2">
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture={camera ? 'environment' : undefined}
        className="hidden"
        disabled={disabled}
        onChange={(e) => pick(e.target.files?.[0] ?? null)}
      />
      {file && previewUrl ? (
        <>
          <img src={previewUrl} alt={t('image.preview')} className="block max-h-64 w-full rounded-card bg-surface object-contain" />
          <div className="flex flex-wrap gap-3">
            <Button variant="secondary" disabled={disabled} onClick={() => inputRef.current?.click()}>{t('image.replace')}</Button>
            <Button variant="ghost" disabled={disabled} onClick={() => pick(null)}>{t('image.remove')}</Button>
          </div>
        </>
      ) : (
        <Button variant="secondary" block disabled={disabled} onClick={() => inputRef.current?.click()}>
          {t('image.choose')}
        </Button>
      )}
    </div>
  )
}
