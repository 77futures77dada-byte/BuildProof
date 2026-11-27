import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { AccessRow } from '../hooks/useProjectAccessSettings'
import { formatDate } from '../lib/format'
import { Button, StatusIcon, cx } from './ui'

interface MemberAccessRowProps {
  row: AccessRow
  /** `on-project`: «Люди объекта»; `in-company`: «Уже работают у вас». */
  variant: 'on-project' | 'in-company'
  /** in-company: «Добавить на объект». Rejects on failure. */
  onAdd?: (row: AccessRow) => Promise<void>
  /** on-project: «⋯» → «Убрать с объекта» (the page confirms). */
  onRemove?: (row: AccessRow) => void
  /** on-project, gate open: «Отправить код входа». */
  onSendCode?: (row: AccessRow) => void
  /** `?focus=silent`: silent 3+ days, framed and on top (03 §5.7). */
  silent?: boolean
  sendCodeLabel?: string
}

/**
 * PersonRow (03 §9): name · role · «последний отчёт {дата}» / «отчётов ещё
 * нет» (never «приглашён», residual М4-7) and the row's actions, each ≥ 48 px.
 */
export function MemberAccessRow({ row, variant, onAdd, onRemove, onSendCode, silent, sendCodeLabel }: MemberAccessRowProps) {
  const { t } = useTranslation()
  const name = row.name || t('common.noName')
  const [menu, setMenu] = useState(false)
  const [state, setState] = useState<'idle' | 'adding' | 'error'>('idle')

  async function add() {
    if (!onAdd) return
    setState('adding')
    try {
      await onAdd(row)
      setState('idle')
    } catch {
      setState('error')
    }
  }

  const status = row.lastReportAt ? t('people.lastReport', { date: formatDate(row.lastReportAt) }) : t('people.noReportsYet')

  return (
    <li
      data-person={row.userId}
      className={cx(
        'flex list-none flex-col gap-3 border-b-2 border-line py-3 last:border-b-0',
        silent && 'rounded-card border-2 border-stale px-3',
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 flex-col">
          <span className="text-field text-fg [overflow-wrap:anywhere]">{name}</span>
          <span className="text-body text-fg">
            {t(`roles.${row.role}`)}
            {variant === 'on-project' ? <> · <span className="inline-flex items-center gap-1">{silent ? <StatusIcon kind="stale" /> : null}{status}</span></> : null}
          </span>
        </div>
        {variant === 'on-project' && onRemove ? (
          <Button
            variant="ghost"
            aria-label={`${t('common.actions')}: ${name}`}
            aria-expanded={menu}
            onClick={() => setMenu((v) => !v)}
            className="min-w-12 shrink-0 px-3"
          >
            <svg aria-hidden="true" viewBox="0 0 24 24" className="size-6" fill="currentColor"><circle cx="5" cy="12" r="2" /><circle cx="12" cy="12" r="2" /><circle cx="19" cy="12" r="2" /></svg>
          </Button>
        ) : null}
        {variant === 'in-company' && onAdd ? (
          <Button variant="secondary" loading={state === 'adding'} onClick={() => void add()} className="shrink-0">
            {t('known.add')}
          </Button>
        ) : null}
      </div>
      {variant === 'on-project' && onSendCode ? (
        <Button variant="secondary" onClick={() => onSendCode(row)} className="self-start">{sendCodeLabel ?? t('people.sendCode')}</Button>
      ) : null}
      {menu && onRemove ? (
        <Button variant="danger" onClick={() => { setMenu(false); onRemove(row) }} className="self-start">{t('people.remove')}</Button>
      ) : null}
      {state === 'error' ? (
        <p role="alert" className="m-0 flex items-center gap-2 text-body font-medium text-fg"><StatusIcon kind="error" />{t('known.addFailed')}</p>
      ) : null}
    </li>
  )
}
