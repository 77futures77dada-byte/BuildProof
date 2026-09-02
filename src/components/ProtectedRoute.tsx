import type { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { FullPageSpinner } from './Spinner'
import { ErrorMessage } from './ErrorMessage'

/**
 * Gate for authenticated routes. While the session is resolving we show a
 * spinner; with no session we redirect to /login, preserving the attempted
 * location so we can send the user back after sign-in.
 */
export function ProtectedRoute({ children }: { children: ReactNode }) {
  const { session, loading, error, refreshProfile } = useAuth()
  const location = useLocation()

  if (loading) return <FullPageSpinner />

  if (!session) {
    return <Navigate to="/login" replace state={{ from: location }} />
  }

  if (error) {
    return (
      <div className="mx-auto max-w-md p-6">
        <ErrorMessage
          message={`Не удалось загрузить профиль. ${error}`}
          onRetry={() => void refreshProfile()}
        />
      </div>
    )
  }

  return <>{children}</>
}
