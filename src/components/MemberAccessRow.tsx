import { useState } from 'react'
import type { AccessRow } from '../hooks/useProjectAccessSettings'
import { ROLE_LABELS } from '../types'
import { toErrorMessage } from '../lib/format'
import { Toggle } from './Toggle'
import { ErrorMessage } from './ErrorMessage'

interface MemberAccessRowProps {
  row: AccessRow
  onToggle: (userId: string, next: boolean) => Promise<void>
}

export function MemberAccessRow({ row, onToggle }: MemberAccessRowProps) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handle(next: boolean) {
    setBusy(true)
    setError(null)
    try {
      await onToggle(row.userId, next)
    } catch (err) {
      setError(toErrorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <li className="space-y-1 px-4 py-3">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm text-slate-900">{row.name}</p>
          <p className="text-xs text-slate-500">{ROLE_LABELS[row.role]}</p>
        </div>
        <Toggle
          checked={row.hasAccess}
          disabled={busy}
          onChange={handle}
          label={`Доступ к объекту: ${row.name}`}
        />
      </div>
      <ErrorMessage message={error} />
    </li>
  )
}
