import { supabase } from './supabaseClient'
import { changeLocale, getStoredLocale, isLocale } from '../i18n'
import type { Locale } from '../i18n'

/**
 * Persist the language choice on the profile. Best-effort: the UI has already
 * switched and localStorage holds the choice, so a failure (offline, column
 * not migrated yet) is logged rather than shown.
 */
export async function saveProfileLocale(userId: string, locale: Locale): Promise<void> {
  const { error } = await supabase.from('profiles').update({ locale }).eq('id', userId)
  if (error) console.warn('profiles.locale update failed:', error.message)
}

/**
 * Reconcile the device language with `profiles.locale` after sign-in:
 * - an explicit choice on this device wins and is pushed to the profile;
 * - otherwise the profile's language is applied (without marking it as an
 *   explicit device choice).
 *
 * Read separately from the main profile query so a missing column can never
 * block sign-in.
 */
export async function syncProfileLocale(userId: string): Promise<void> {
  const { data, error } = await supabase
    .from('profiles')
    .select('locale')
    .eq('id', userId)
    .maybeSingle()
  if (error) {
    console.warn('profiles.locale read failed:', error.message)
    return
  }
  const profileLocale = (data as { locale?: unknown } | null)?.locale

  const stored = getStoredLocale()
  if (stored) {
    if (stored !== profileLocale) await saveProfileLocale(userId, stored)
    return
  }
  if (isLocale(profileLocale)) await changeLocale(profileLocale, false)
}
