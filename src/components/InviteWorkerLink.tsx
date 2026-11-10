import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Copy, MessageCircle } from 'lucide-react'

/**
 * «Отправить ссылку рабочему в WhatsApp»: opens WhatsApp with a ready message.
 *
 * TODO(worker-links, C3): personal links per worker come from Codex. Until
 * then the message carries the app's general sign-in address.
 */
export function InviteWorkerLink({ projectName }: { projectName: string }) {
  const { t } = useTranslation()
  const [copied, setCopied] = useState(false)
  const url = `${window.location.origin}/login`
  const text = t('invite.message', { project: projectName, url })

  async function copy() {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 2500)
    } catch {
      setCopied(false)
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
      <a
        href={`https://wa.me/?text=${encodeURIComponent(text)}`}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex min-h-11 items-center gap-2 text-sm font-medium text-sky-700 underline underline-offset-2"
      >
        <MessageCircle className="size-4" aria-hidden="true" />
        {t('invite.whatsapp')}
      </a>
      <button
        type="button"
        onClick={() => void copy()}
        className="inline-flex min-h-11 items-center gap-1.5 text-sm text-slate-600 hover:text-slate-900"
      >
        <Copy className="size-4" aria-hidden="true" />
        <span role="status">{copied ? t('invite.copied') : t('invite.copy')}</span>
      </button>
    </div>
  )
}
