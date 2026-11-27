import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Spinner } from './Spinner'

/** 03 §3.7 `app-loading`: logo + spinner on --bg; after 10 s «Долго грузится» + «Обновить». */
export function AppLoading({ slowAfterMs = 10_000 }: { slowAfterMs?: number }) {
  const { t } = useTranslation()
  const [slow, setSlow] = useState(false)
  useEffect(() => {
    const id = window.setTimeout(() => setSlow(true), slowAfterMs)
    return () => window.clearTimeout(id)
  }, [slowAfterMs])

  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-5 bg-page px-4 text-center text-fg">
      <p className="m-0 text-h2 text-fg">BuildProof</p>
      <Spinner label={t('common.loadingEllipsis')} />
      {slow ? (
        <div className="flex flex-col items-center gap-3">
          <p className="m-0 text-body text-fg" role="status">{t('common.slow')}</p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="inline-flex min-h-12 items-center justify-center rounded-control border-2 border-fg bg-page px-5 text-field font-semibold text-fg hover:bg-surface"
          >
            {t('common.reload')}
          </button>
        </div>
      ) : null}
    </div>
  )
}
