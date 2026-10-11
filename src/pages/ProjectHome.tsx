import { Navigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { ProjectDashboard } from './ProjectDashboard'

/**
 * /project/:id index. Workers land on their "Сегодня" screen; everyone else
 * gets the overview. Redirecting here (not inside ProjectDashboard) keeps the
 * overview queries from firing for workers.
 */
export function ProjectHome() {
  const { profile } = useAuth()
  if (profile?.role === 'worker') return <Navigate to="today" replace />
  return <ProjectDashboard />
}
