import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { StatusIcon } from './StatusIcon'

/** `navigator.onLine` as state (true when unknown). */
export function useOnline(): boolean {
  const [online, setOnline] = useState(() => typeof navigator === 'undefined' || navigator.onLine !== false)
  useEffect(() => {
    const on = () => setOnline(true)
    const off = () => setOnline(false)
    window.addEventListener('online', on)
    window.addEventListener('offline', off)
    return () => {
      window.removeEventListener('online', on)
      window.removeEventListener('offline', off)
    }
  }, [])
  return online
}

/**
 * Offline strip (03 §0.2 `offline`): «Нет сети» only while `navigator.onLine`
 * is false — the only place these words appear; «Сеть есть» for 2 s after.
 */
export function NetBar() {
  const { t } = useTranslation()
  const online = useOnline()
  const [back, setBack] = useState(false)
  const [wasOffline, setWasOffline] = useState(!online)
  if (!online && !wasOffline) setWasOffline(true)
  if (online && wasOffline) { setWasOffline(false); setBack(true) }
  useEffect(() => {
    if (!back) return
    const id = setTimeout(() => setBack(false), 2000)
    return () => clearTimeout(id)
  }, [back])
  if (online && !back) return null
  return (
    <p role="status" data-netbar={online ? 'back-online' : 'offline'} className="m-0 flex min-h-12 items-center gap-2 rounded-control border-2 border-fg bg-surface px-3 text-body font-semibold text-fg">
      {online ? null : <StatusIcon kind="error" />}
      {online ? t('common.backOnline') : t('common.offline')}
    </p>
  )
}
