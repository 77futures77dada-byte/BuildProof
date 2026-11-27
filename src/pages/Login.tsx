import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { Link, Navigate, useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { supabase } from '../lib/supabaseClient'
import { signInErrorMessage } from '../lib/authErrors'
import { isEmailGateOpen, legalContact } from '../lib/emailGate'
import { parseLinkError } from '../lib/authCode'
import type { LinkError } from '../lib/authCode'
import { isProfileConfigured } from '../lib/profile'
import { routeAfterSignIn } from '../lib/roleRoute'
import { useAuth } from '../hooks/useAuth'
import { Button, TextField, buttonClass } from '../components/ui'
import { ErrorMessage } from '../components/ErrorMessage'
import { AppLoading } from '../components/AppLoading'
import { AuthScreen } from '../components/AuthScreen'
import { PasswordField } from '../components/auth/fields'
import { CodeEnter, CodeRequest, InviteCode, LinkErrorScreen, SetPassword } from '../components/auth/CodeScreens'
import type { UserRole } from '../types'

interface LocationState {
  from?: { pathname: string }
}

/** Projects the person can open (RLS): two are enough to tell «one» from «several». */
async function accessibleProjectIds(): Promise<string[]> {
  const { data, error } = await supabase.from('projects').select('id').limit(2)
  if (error) throw error
  return ((data ?? []) as { id: string }[]).map((p) => p.id)
}

/** After sign-in: route by role (residual М4-7). */
function RouteByRole({ role, from }: { role: UserRole; from: string | null }) {
  const [target, setTarget] = useState<string | null>(role === 'gc' ? routeAfterSignIn(role, [], from) : null)
  useEffect(() => {
    if (target) return
    let cancelled = false
    accessibleProjectIds()
      .then((ids) => !cancelled && setTarget(routeAfterSignIn(role, ids, from)))
      .catch(() => !cancelled && setTarget(routeAfterSignIn(role, [], from)))
    return () => {
      cancelled = true
    }
  }, [role, from, target])
  return target ? <Navigate to={target} replace /> : <AppLoading />
}

/**
 * /login (03 §3.1–§3.6). Gate closed (default build): password only, no
 * sign-up, no recovery by mail. Gate open (VITE_EMAIL_GATE_OPEN=true, after
 * K34): code sign-in `?mode=code[&step=enter][&reset=1]`, invitation code
 * `?mode=invite[&email=…]`, the optional «Задайте пароль».
 */
export function Login() {
  const { session, profile, profileLoadedFor, loading: authLoading, error: profileError } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const gateOpen = isEmailGateOpen()
  const from = (location.state as LocationState | null)?.from?.pathname ?? null

  const mode = gateOpen ? params.get('mode') : null
  const reset = params.get('reset') === '1'
  // Invitation link fallback (implicit flow, `#…type=invite`) or the code: offer a password next.
  const [offerPassword, setOfferPassword] = useState(() => /type=(invite|recovery)/.test(location.hash) || (mode === 'code' && reset))
  const [hashError, setLinkError] = useState<LinkError | null>(() => parseLinkError(location.hash, location.search))
  // PKCE `?code=` that did not turn into a session: the link was opened in another browser.
  const linkError = hashError ?? (!authLoading && !session ? parseLinkError('', location.search, true) : null)

  if (authLoading) return <AppLoading />

  if (session) {
    if (profileLoadedFor !== session.user.id) return <AppLoading />
    // ProtectedRoute owns profile errors and onboarding (company creation, name).
    if (profileError || !isProfileConfigured(profile)) return <Navigate to="/dashboard" replace />
    if (offerPassword && gateOpen && profile.role !== 'worker') {
      return (
        <AuthScreen>
          <SetPassword onDone={() => setOfferPassword(false)} />
        </AuthScreen>
      )
    }
    return <RouteByRole role={profile.role} from={from} />
  }

  const go = (search: string) => {
    setLinkError(null)
    navigate({ pathname: '/login', search, hash: '' }, { replace: true })
  }

  let content
  if (linkError) {
    content = (
      <LinkErrorScreen
        kind={linkError}
        gateOpen={gateOpen}
        onDismiss={(to) => go(to === 'code' ? '?mode=code' : to === 'enter' ? '?mode=code&step=enter' : '')}
      />
    )
  } else if (mode === 'code' && params.get('step') === 'enter') {
    content = <CodeEnter onOtherEmail={() => go(reset ? '?mode=code&reset=1' : '?mode=code')} />
  } else if (mode === 'code') {
    content = <CodeRequest reset={reset} onSent={() => go(`?mode=code&step=enter${reset ? '&reset=1' : ''}`)} />
  } else if (mode === 'invite') {
    content = <InviteCode prefilledEmail={params.get('email')} onSignedIn={() => setOfferPassword(true)} />
  } else {
    content = <PasswordForm gateOpen={gateOpen} />
  }

  return <AuthScreen footer={<LoginFooter gateOpen={gateOpen} />}>{content}</AuthScreen>
}

function PasswordForm({ gateOpen }: { gateOpen: boolean }) {
  const { t } = useTranslation()
  const contact = legalContact()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setSubmitting(true)
    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({ email: email.trim(), password })
      if (signInError) setError(signInErrorMessage(signInError))
      // On success the auth listener updates context and Login routes by role.
    } catch (err) {
      setError(signInErrorMessage(err))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <>
      <div className="flex flex-col gap-2">
        <h1 className="m-0 text-h1 text-fg">{t('common.signIn')}</h1>
        <p className="m-0 text-body text-fg">{gateOpen ? t('auth.taglineOpen') : t('auth.tagline')}</p>
      </div>
      <form onSubmit={handleSubmit} className="flex flex-col gap-5" noValidate>
        <TextField
          label={t('auth.email')}
          type="email"
          inputMode="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={submitting}
        />
        <PasswordField
          label={t('auth.password')}
          autoComplete="current-password"
          required
          value={password}
          onValue={setPassword}
          disabled={submitting}
        />
        <ErrorMessage message={error} />
        <Button type="submit" block loading={submitting}>{t('common.signIn')}</Button>
      </form>
      {gateOpen ? (
        <div className="flex flex-col gap-3">
          <Link to="/login?mode=code" className={buttonClass({ variant: 'secondary', block: true })}>{t('auth.signInWithCode')}</Link>
          <Link to="/login?mode=invite" className={buttonClass({ variant: 'secondary', block: true })}>{t('auth.haveInviteCode')}</Link>
          <Link to="/login?mode=code&reset=1" className={buttonClass({ variant: 'ghost', block: true })}>{t('auth.forgotPassword')}</Link>
        </div>
      ) : (
        <div className="flex flex-col gap-1">
          <p className="m-0 text-body text-fg">{t('auth.recoveryLater')}</p>
          <ContactLines phone={contact.phone} email={contact.email} />
        </div>
      )}
    </>
  )
}

function ContactLines({ phone, email }: { phone: string | null; email: string | null }) {
  const { t } = useTranslation()
  return (
    <>
      {phone ? (
        <a href={`tel:${phone.replace(/\s+/g, '')}`} className="inline-flex min-h-12 items-center text-body font-semibold text-fg underline underline-offset-4">
          {t('common.contactPhone', { phone })}
        </a>
      ) : null}
      {email ? (
        <a href={`mailto:${email}`} className="inline-flex min-h-12 items-center text-body font-semibold text-fg underline underline-offset-4">
          {t('common.contactEmail', { email })}
        </a>
      ) : null}
    </>
  )
}

/** Sign-up only behind the gate (residual М4-1); «На главную» always. */
function LoginFooter({ gateOpen }: { gateOpen: boolean }) {
  const { t } = useTranslation()
  const contact = legalContact()
  return (
    <>
      {gateOpen ? (
        <Link to="/#start" className={buttonClass({ variant: 'ghost', block: true })}>{t('auth.startFree')}</Link>
      ) : (
        <div className="flex flex-col gap-1">
          <p className="m-0 text-body text-fg">{t('auth.signupLater')}</p>
          <ContactLines phone={contact.phone} email={contact.email} />
        </div>
      )}
      <Link to="/" className={buttonClass({ variant: 'ghost', block: true })}>{t('auth.backHome')}</Link>
    </>
  )
}
