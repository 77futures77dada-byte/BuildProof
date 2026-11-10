import i18n from '../i18n'

/**
 * Supabase auth errors come in English. Map the ones a person can act on and
 * fall back to a localized generic line, so no raw English reaches the screen.
 *
 * «Email not confirmed» can only happen while e-mail confirmation is switched
 * on in Supabase; with it off this branch never fires.
 */
export function signInErrorMessage(err: unknown): string {
  const e = (err ?? {}) as { code?: string; message?: string; name?: string }
  const msg = e.message ?? ''
  if (e.code === 'invalid_credentials' || msg === 'Invalid login credentials') return i18n.t('auth.invalidCredentials')
  if (e.code === 'email_not_confirmed' || /email not confirmed/i.test(msg)) return i18n.t('auth.emailNotConfirmed')
  if (e.code === 'over_request_rate_limit' || /rate limit/i.test(msg)) return i18n.t('auth.rateLimited')
  if (e.name === 'TypeError' || /failed to fetch|network/i.test(msg)) return i18n.t('auth.network')
  return i18n.t('auth.signInFailed')
}
