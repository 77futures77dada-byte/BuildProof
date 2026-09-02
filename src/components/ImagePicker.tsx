import { useEffect, useRef, useState } from 'react'
import { Button } from './Button'

interface ImagePickerProps {
  /** Fires with the chosen file, or null when cleared. */
  onChange: (file: File | null) => void
  disabled?: boolean
}

/**
 * File input + thumbnail preview for a single image. Owns the preview object
 * URL (revoked on replace and unmount). Shared by the photo upload form and the
 * issue form. Reset it by remounting (e.g. a changing `key`).
 */
export function ImagePicker({ onChange, disabled }: ImagePickerProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const urlRef = useRef<string | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)

  useEffect(() => {
    return () => {
      if (urlRef.current) URL.revokeObjectURL(urlRef.current)
    }
  }, [])

  function pick(next: File | null) {
    if (urlRef.current) {
      URL.revokeObjectURL(urlRef.current)
      urlRef.current = null
    }
    const url = next ? URL.createObjectURL(next) : null
    urlRef.current = url
    setPreviewUrl(url)
    onChange(next)
  }

  return (
    <div className="space-y-2">
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        disabled={disabled}
        onChange={(e) => pick(e.target.files?.[0] ?? null)}
      />
      {previewUrl ? (
        <div className="space-y-1">
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={disabled}
            className="block w-full"
          >
            <img
              src={previewUrl}
              alt="Предпросмотр"
              className="max-h-64 w-full rounded-lg bg-slate-100 object-contain"
            />
          </button>
          <div className="flex gap-3 text-xs">
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              disabled={disabled}
              className="text-sky-700 underline underline-offset-2"
            >
              Заменить
            </button>
            <button
              type="button"
              onClick={() => pick(null)}
              disabled={disabled}
              className="text-slate-500 underline underline-offset-2"
            >
              Убрать
            </button>
          </div>
        </div>
      ) : (
        <Button
          variant="secondary"
          className="w-full"
          disabled={disabled}
          onClick={() => inputRef.current?.click()}
        >
          Выбрать фото
        </Button>
      )}
    </div>
  )
}
