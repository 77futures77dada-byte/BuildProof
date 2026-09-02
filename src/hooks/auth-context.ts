import { createContext } from 'react'
import type { Session, User } from '@supabase/supabase-js'
import type { Profile } from '../types'

export interface AuthContextValue {
  /** Supabase auth session, or null when signed out. */
  session: Session | null
  /** Convenience accessor for `session.user`. */
  user: User | null
  /** The signed-in user's row from `profiles` (role, company_id, ...). */
  profile: Profile | null
  /** True until the initial session + profile lookup has settled. */
  loading: boolean
  /** Non-null if loading the profile failed; the UI should surface it. */
  error: string | null
  signOut: () => Promise<void>
  /** Re-fetch the profile (e.g. after it is created server-side). */
  refreshProfile: () => Promise<void>
}

export const AuthContext = createContext<AuthContextValue | undefined>(undefined)
