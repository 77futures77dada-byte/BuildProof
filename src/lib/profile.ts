import type { Profile } from '../types'

/**
 * A profile is "configured" only when an administrator has finished setting it
 * up: the row exists, it has a role, and — for a general contractor — it is
 * linked to a company. Until then the user is signed in but can't be routed
 * anywhere useful, so we show the "profile not configured" screen instead.
 */
export function isProfileConfigured(profile: Profile | null): profile is Profile {
  if (!profile) return false
  if (!profile.role) return false
  if (profile.role === 'gc' && !profile.company_id) return false
  return true
}

/**
 * A self sign-up has no profile (or a gc profile without a company): the app
 * creates the company itself (docs/contracts/onboarding.md). Invited people
 * always get a profile row from api/invite.ts, so they never land here.
 */
export function needsCompany(profile: Profile | null): boolean {
  return !profile || (profile.role === 'gc' && !profile.company_id)
}

/** create_company_and_profile(null, null, locale) — idempotent on the server. */
export async function createCompanyForSelf(locale: string): Promise<void> {
  const { supabase } = await import('./supabaseClient')
  const { error } = await supabase.rpc('create_company_and_profile', {
    p_company_name: null,
    p_full_name: null,
    p_locale: locale,
  })
  if (error) throw error
}

/** Optional onboarding step 3б: the name shown in the change history. */
export async function saveFullName(userId: string, fullName: string): Promise<void> {
  const { supabase } = await import('./supabaseClient')
  const { error } = await supabase.from('profiles').update({ full_name: fullName.trim() }).eq('id', userId)
  if (error) throw error
}
