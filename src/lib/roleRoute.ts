import type { UserRole } from '../types'

/**
 * Where a person lands right after sign-in (residual М4-7, 03 §1):
 * gc → /dashboard; worker with one site → its «Сегодня»; foreman / client
 * with one site → its overview; anyone else → their list on /dashboard.
 * An explicit `from` (ProtectedRoute bounce) wins, except the login page itself.
 */
export function routeAfterSignIn(role: UserRole, projectIds: readonly string[], from?: string | null): string {
  if (from && from !== '/login' && from !== '/' && from !== '/dashboard') return from
  if (role === 'gc' || projectIds.length !== 1) return '/dashboard'
  const id = projectIds[0]
  return role === 'worker' ? `/project/${id}/today` : `/project/${id}`
}
