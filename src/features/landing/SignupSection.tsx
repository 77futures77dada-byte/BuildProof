import { useState } from 'react'
import type { FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import type { LandingCopy } from './copy'

const EMAIL_RE = /^\S+@\S+\.\S+$/
const CODE_LENGTH = 6

type Step =
  | { kind: 'email'; status: 'idle' | 'sending' | 'invalid' | 'failed' }
  | { kind: 'code'; email: string; status: 'idle' | 'verifying' | 'invalid' }

/** Supabase is loaded on submit only, so the landing chunk stays without it. */
const loadSupabase = () => import('../../lib/supabaseClient').then((m) => m.supabase)

/**
 * E-mail sign-up: Supabase sends one message with a magic link and, when the
 * e-mail template includes {{ .Token }}, a 6-digit code. Either signs the user
 * in; the code path verifies here and continues to /dashboard.
 */
export function SignupSection({ copy }: { copy: LandingCopy }) {
  const f = copy.final
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [step, setStep] = useState<Step>({ kind: 'email', status: 'idle' })

  async function sendEmail(e: FormEvent) {
    e.preventDefault()
    const address = email.trim()
    if (!EMAIL_RE.test(address)) {
      setStep({ kind: 'email', status: 'invalid' })
      return
    }
    setStep({ kind: 'email', status: 'sending' })
    try {
      const supabase = await loadSupabase()
      const { error } = await supabase.auth.signInWithOtp({
        email: address,
        options: { shouldCreateUser: true, emailRedirectTo: `${window.location.origin}/dashboard` },
      })
      if (error) throw error
      setCode('')
      setStep({ kind: 'code', email: address, status: 'idle' })
    } catch (err) {
      console.warn('signInWithOtp failed:', err)
      setStep({ kind: 'email', status: 'failed' })
    }
  }

  async function verifyCode(e: FormEvent) {
    e.preventDefault()
    if (step.kind !== 'code') return
    setStep({ ...step, status: 'verifying' })
    try {
      const supabase = await loadSupabase()
      const { error } = await supabase.auth.verifyOtp({ email: step.email, token: code.trim(), type: 'email' })
      if (error) throw error
      navigate('/dashboard')
    } catch (err) {
      console.warn('verifyOtp failed:', err)
      setStep({ ...step, status: 'invalid' })
    }
  }

  return (
    <section className="final" id="start" aria-labelledby="start-title">
      <div className="in">
        <h2 id="start-title">{f.title}</h2>
        <p>{f.lead}</p>

        {step.kind === 'email' ? (
          <form className="signup" onSubmit={sendEmail} noValidate>
            <label htmlFor="signup-email">{f.emailLabel}</label>
            <input
              id="signup-email"
              type="email"
              inputMode="email"
              autoComplete="email"
              placeholder={f.emailPlaceholder}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              aria-invalid={step.status === 'invalid'}
              aria-describedby="signup-note"
            />
            <button className="btn btn-main" type="submit" disabled={step.status === 'sending'}>
              {step.status === 'sending' ? f.sending : f.submit}
            </button>
            <div id="signup-note" className={`note${step.status === 'idle' || step.status === 'sending' ? '' : ' err'}`} role="status">
              {step.status === 'invalid' ? f.invalidEmail : step.status === 'failed' ? f.failed : ''}
            </div>
            <div className="hint">{f.hint}</div>
          </form>
        ) : (
          <form className="signup" onSubmit={verifyCode} noValidate>
            <div className="note" role="status">
              {f.sent(step.email)}
            </div>
            <label htmlFor="signup-code">{f.codeLabel}</label>
            <input
              id="signup-code"
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              pattern="[0-9]*"
              maxLength={CODE_LENGTH}
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
              aria-invalid={step.status === 'invalid'}
              aria-describedby="signup-code-note"
            />
            <button className="btn btn-main" type="submit" disabled={code.length !== CODE_LENGTH || step.status === 'verifying'}>
              {step.status === 'verifying' ? f.verifying : f.verify}
            </button>
            <div id="signup-code-note" className="note err" role="status">
              {step.status === 'invalid' ? f.invalidCode : ''}
            </div>
            <button type="button" className="linkbtn" onClick={() => setStep({ kind: 'email', status: 'idle' })}>
              {f.changeEmail}
            </button>
          </form>
        )}
      </div>
    </section>
  )
}
