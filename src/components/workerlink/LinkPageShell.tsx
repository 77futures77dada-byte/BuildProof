import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { LanguageSwitcher } from '../LanguageSwitcher'
import { EmptyState, StatusIcon } from '../ui'

/** Frame of the public link pages (/w, /c): title block, language, content. No sign-in, no app navigation. */
export function LinkPageShell({ title, subtitle, children }: { title: ReactNode; subtitle?: ReactNode; children: ReactNode }) {
  return (
    <div className="min-h-dvh bg-page text-fg">
      <header className="border-b border-line">
        <div className="mx-auto flex max-w-[720px] items-start justify-between gap-3 px-4 py-3">
          <div className="flex min-w-0 flex-col gap-1">
            <h1 className="m-0 text-h2 font-medium [overflow-wrap:anywhere]">{title}</h1>
            {subtitle ? <p className="m-0 text-body font-medium [overflow-wrap:anywhere]">{subtitle}</p> : null}
          </div>
          <LanguageSwitcher className="shrink-0" />
        </div>
      </header>
      <main className="mx-auto flex max-w-[720px] flex-col gap-6 px-4 py-6">{children}</main>
    </div>
  )
}

/** No token on this device, or the API says the link no longer works. */
export function LinkProblem({ kind }: { kind: 'missing' | 'invalid' }) {
  const { t } = useTranslation()
  return kind === 'missing' ? (
    <EmptyState icon="error" title={t('linkPage.noLink.title')} text={t('linkPage.noLink.text')} who={t('linkPage.noLink.who')} />
  ) : (
    <p role="alert" data-link-invalid className="m-0 flex items-start gap-2 rounded-card border border-line bg-surface p-4 text-field font-medium text-fg">
      <StatusIcon kind="error" className="mt-0.5" />{t('linkPage.error.invalidLink')}
    </p>
  )
}
