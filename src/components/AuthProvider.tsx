import { useCallback, useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '../lib/supabaseClient'
import { toErrorMessage } from '../lib/format'
import type { Profile } from '../types'
import { AuthContext } from '../hooks/auth-context'
import type { AuthContextValue } from '../hooks/auth-context'

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Tracks the latest user we started fetching a profile for, so out-of-order
  // responses (fast sign-out after sign-in) don't clobber newer state.
  const activeUserId = useRef<string | null>(null)

  const loadProfile = useCallback(async (userId: string) => {
    activeUserId.current = userId
    setError(null)
    const { data, error: profileError } = await supabase
      .from('profiles')
      .select('id, company_id, full_name, role')
      .eq('id', userId)
      .maybeSingle()

    if (activeUserId.current !== userId) return

    if (profileError) {
      setError(toErrorMessage(profileError))
      setProfile(null)
      return
    }
    setProfile(data as Profile | null)
  }, [])

  const applySession = useCallback(
    async (next: Session | null) => {
      setSession(next)
      if (next?.user) {
        await loadProfile(next.user.id)
      } else {
        activeUserId.current = null
        setProfile(null)
        setError(null)
      }
    },
    [loadProfile],
  )

  useEffect(() => {
    let cancelled = false

    supabase.auth
      .getSession()
      .then(async ({ data }) => {
        if (cancelled) return
        await applySession(data.session)
      })
      .catch((err) => {
        if (cancelled) return
        setError(toErrorMessage(err))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    const { data: sub } = supabase.auth.onAuthStateChange((_event, next) => {
      // Fire-and-forget: keep the listener callback synchronous.
      void applySession(next)
    })

    return () => {
      cancelled = true
      sub.subscription.unsubscribe()
    }
  }, [applySession])

  const signOut = useCallback(async () => {
    const { error: signOutError } = await supabase.auth.signOut()
    if (signOutError) {
      setError(toErrorMessage(signOutError))
      return
    }
    activeUserId.current = null
    setSession(null)
    setProfile(null)
  }, [])

  const refreshProfile = useCallback(async () => {
    if (session?.user) await loadProfile(session.user.id)
  }, [session, loadProfile])

  const value: AuthContextValue = {
    session,
    user: session?.user ?? null,
    profile,
    loading,
    error,
    signOut,
    refreshProfile,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
