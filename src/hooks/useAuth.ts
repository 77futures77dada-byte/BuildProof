import { useContext } from 'react'
import { AuthContext } from './auth-context'
import type { AuthContextValue } from './auth-context'

/**
 * Access the current auth state: session, user, profile (role + company),
 * plus loading/error flags and sign-out.
 *
 * Must be used inside <AuthProvider>.
 */
export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) {
    throw new Error('useAuth must be used within <AuthProvider>')
  }
  return ctx
}
