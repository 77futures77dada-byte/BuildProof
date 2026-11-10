import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import type { LandingCopy } from './copy'

const EMAIL_RE = /^\S+@\S+\.\S+$/
const MIN_PASSWORD = 8

type Status = 'idle' | 'sending' | 'invalidEmail' | 'shortPassword' | 'exists' | 'failed' | 'created'

/** Supabase is loaded on submit only, so the landing chunk stays without it. */
const loadSupabase = () => import('../../lib/supabaseClient').then((m) => m.supabase)

/**
 * Sign-up with e-mail and password. Magic link / e-mail code are off until we
 * have our own domain and SMTP: Supabase's default mailer cannot carry
 * {{ .Token }}, so the page promises neither a link nor a code.
 */
export function SignupSection({ copy }: { copy: LandingCopy }) {
  const f = copy.final
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [status, setStatus] = useState<Status>('idle')
  const location = useLocation()

  // Arriving from another route at /#start (e.g. «Начать бесплатно» on the
  // login screen): this section mounts late (lazy chunk), so scroll here.
  useEffect(() => {
    if (location.hash === '#start') document.getElementById('start')?.scrollIntoView()
  }, [location.hash])

  async function submit(e: FormEvent) {
    e.preventDefault()
    const address = email.trim()
    if (!EMAIL_RE.test(address)) return setStatus('invalidEmail')
    if (password.length < MIN_PASSWORD) return setStatus('shortPassword')
    setStatus('sending')
    try {
      const supabase = await loadSupabase()
      const { data, error } = await supabase.auth.signUp({ email: address, password })
      if (error) {
        if (error.code === 'user_already_exists' || /already registered/i.test(error.message)) return setStatus('exists')
        throw error
      }
      if (data.session) navigate('/dashboard')
      else setStatus('created')
    } catch (err) {
      console.warn('signUp failed:', err)
      setStatus('failed')
    }
  }

  const message =
    status === 'invalidEmail'
      ? f.invalidEmail
      : status === 'shortPassword'
        ? f.shortPassword(MIN_PASSWORD)
        : status === 'exists'
          ? f.exists
          : status === 'failed'
            ? f.failed
            : status === 'created'
              ? f.created
              : ''
  const isError = status !== 'idle' && status !== 'sending' && status !== 'created'

  return (
    <section className="final" id="start" aria-labelledby="start-title">
      <div className="in">
        <h2 id="start-title">{f.title}</h2>
        <p>{f.lead}</p>

        <form className="signup" onSubmit={submit} noValidate>
          <label htmlFor="signup-email">{f.emailLabel}</label>
          <input
            id="signup-email"
            type="email"
            inputMode="email"
            autoComplete="email"
            placeholder={f.emailPlaceholder}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            aria-invalid={status === 'invalidEmail'}
            aria-describedby="signup-note"
          />
          <label htmlFor="signup-password">{f.passwordLabel}</label>
          <input
            id="signup-password"
            type="password"
            autoComplete="new-password"
            minLength={MIN_PASSWORD}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            aria-invalid={status === 'shortPassword'}
            aria-describedby="signup-note"
          />
          <button className="btn btn-main" type="submit" disabled={status === 'sending'}>
            {status === 'sending' ? f.sending : f.submit}
          </button>
          <div id="signup-note" className={`note${isError ? ' err' : ''}`} role="status">
            {message}
          </div>
          {status === 'exists' || status === 'created' ? (
            <Link className="linkbtn" to="/login">
              {f.toLogin}
            </Link>
          ) : (
            <div className="hint">{f.hint}</div>
          )}
        </form>
      </div>
    </section>
  )
}
