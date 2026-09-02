import { Navigate, useParams } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { useProjectAccessSettings } from '../hooks/useProjectAccessSettings'
import { Spinner } from '../components/Spinner'
import { ErrorMessage } from '../components/ErrorMessage'
import { MemberAccessRow } from '../components/MemberAccessRow'

export function Settings() {
  const { id } = useParams<{ id: string }>()
  const { profile } = useAuth()

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
      <ErrorMessage message="У вашего профиля не указана компания. Обратитесь к администратору." />
    )
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-sm font-semibold text-slate-700">Доступ к объекту</h2>
        <p className="mt-1 text-xs text-slate-500">
          Отметьте, кто из сотрудников компании видит этот объект.
        </p>
      </div>

      {loading ? (
        <Spinner label="Загрузка сотрудников…" />
      ) : error ? (
        <ErrorMessage message={error} onRetry={reload} />
      ) : rows.length === 0 ? (
        <p className="rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-500 shadow-sm">
          В компании пока нет других сотрудников. Добавьте пользователей через
          Supabase Dashboard — самостоятельное приглашение появится позже.
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
