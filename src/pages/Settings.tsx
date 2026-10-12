import { Navigate, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../hooks/useAuth'
import { useProjectAccessSettings } from '../hooks/useProjectAccessSettings'
import { Spinner } from '../components/Spinner'
import { ErrorMessage } from '../components/ErrorMessage'
import { MemberAccessRow } from '../components/MemberAccessRow'

export function Settings() {
  const { id } = useParams<{ id: string }>()
  const { profile } = useAuth()
  const { t } = useTranslation()

  const { rows, loading, error, reload, toggleAccess } = useProjectAccessSettings(
    id,
    profile?.company_id ?? undefined,
    profile?.id,
  )

  // gc only — everyone else goes back to the project overview.
  if (profile && profile.role !== 'gc') {
    return <Navigate to={`/project/${id}`} replace />
  }

  if (profile && !profile.company_id) {
    return (
      <ErrorMessage message={t('common.noCompany')} />
    )
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-sm font-semibold text-slate-700">{t('settings.accessTitle')}</h2>
        <p className="mt-1 text-xs text-slate-500">
          {t('settings.accessHint')}
        </p>
      </div>

      {loading ? (
        <Spinner label={t('settings.loading')} />
      ) : error ? (
        <ErrorMessage message={error} onRetry={reload} />
      ) : rows.length === 0 ? (
        <p className="rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-500 shadow-sm">
          {t('settings.empty')}
        </p>
      ) : (
        <ul className="divide-y divide-slate-100 rounded-xl border border-slate-200 bg-white shadow-sm">
          {rows.map((row) => (
            <MemberAccessRow key={row.userId} row={row} onToggle={toggleAccess} />
          ))}
        </ul>
      )}
    </div>
  )
}
