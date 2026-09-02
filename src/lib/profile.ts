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
