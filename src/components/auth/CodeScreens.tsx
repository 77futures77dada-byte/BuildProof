import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Button, TextField, buttonClass } from '../ui'
import { ErrorMessage } from '../ErrorMessage'
import { supabase } from '../../lib/supabaseClient'
import {
  clearCodeSent, codeSendError, isValidCode, isValidEmail, maskEmail, readCodeSent, readLastEmail,
  saveCodeSent, saveLastEmail, secondsLeft,
} from '../../lib/authCode'
import type { LinkError } from '../../lib/authCode'
import { CodeField, PasswordField } from './fields'

const MIN_PASSWORD = 8
const passwordLink = '/login'

/** Re-renders every second while `until` is in the future; returns seconds left. */
function useCountdown(sentAt: number | null, wait?: number): number {
  const [now, setNow] = useState(() => Date.now())
  const left = sentAt == null ? 0 : secondsLeft(sentAt, now, wait)
  useEffect(() => {
    if (left <= 0) return
    const id = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(id)
  }, [left])
  return left
}

/** Unknown address is not an error on the public page: same neutral path (residual Б4-М6). */
function isUnknownAddress(err: { code?: string; message?: string }) {
  return err.code === 'otp_disabled' || /signups? not allowed|user not found/i.test(err.message ?? '')
}

type SendResult = { ok: true } | { ok: false; error: 'retryAfter' | 'projectLimit' | 'sendFailed'; wait?: number }

async function sendCode(email: string): Promise<SendResult> {
  try {
    const { error } = await supabase.auth.signInWithOtp({ email, options: { shouldCreateUser: false } })
    if (error && !isUnknownAddress(error)) {
      const kind = codeSendError(error)
      const wait = Number(/(\d+)\s*seconds?/i.exec(error.message)?.[1]) || undefined
      return { ok: false, error: kind, wait }
    }
  } catch (err) {
    return { ok: false, error: codeSendError(err) }
  }
  saveLastEmail(email)
  saveCodeSent({ email, at: Date.now() })
  return { ok: true }
}

/** 03 §3.2 `login-code-request` (also the «Забыли пароль?» reset mode). */
export function CodeRequest({ reset, onSent }: { reset: boolean; onSent: () => void }) {
  const { t } = useTranslation()
  const remembered = readLastEmail()
  const [useOther, setUseOther] = useState(!remembered)
  const [email, setEmail] = useState('')
  const [sending, setSending] = useState(false)
  const [invalid, setInvalid] = useState(false)
  const [failure, setFailure] = useState<{ error: 'retryAfter' | 'projectLimit' | 'sendFailed'; at: number; wait: number } | null>(null)
  const left = useCountdown(failure?.error === 'retryAfter' ? failure.at : null, failure?.wait)

  async function submit(e: FormEvent) {
    e.preventDefault()
    const address = (useOther ? email : remembered ?? '').trim()
    if (!isValidEmail(address)) return setInvalid(true)
    setInvalid(false)
    setSending(true)
    const result = await sendCode(address)
    setSending(false)
    if (result.ok) return onSent()
    setFailure({ error: result.error, at: Date.now(), wait: result.wait ?? 60 })
  }

  const failureText = !failure
    ? null
    : failure.error === 'retryAfter'
      ? left > 0 ? t('auth.retryAfter', { count: left }) : null
      : t(`auth.${failure.error}`)

  return (
    <form onSubmit={submit} className="flex flex-col gap-5" noValidate>
      <h1 className="m-0 text-h1 text-fg">{reset ? t('auth.resetTitle') : t('auth.signInWithCode')}</h1>
      {useOther ? (
        <TextField
          label={t('auth.email')}
          type="email"
          inputMode="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          error={invalid ? t('auth.emailInvalid') : null}
          disabled={sending}
        />
      ) : null}
      <ErrorMessage message={failureText} />
      <Button type="submit" block loading={sending} disabled={failure?.error === 'retryAfter' && left > 0}>
        {useOther || !remembered ? t('auth.sendCode') : t('auth.sendCodeTo', { email: maskEmail(remembered) })}
      </Button>
      {!useOther ? (
        <Button variant="secondary" block onClick={() => setUseOther(true)}>{t('auth.otherEmail')}</Button>
      ) : null}
      <Link to={passwordLink} className={buttonClass({ variant: 'ghost', block: true })}>{t('auth.signInPassword')}</Link>
    </form>
  )
}

/** 03 §3.3 `login-code-enter`; the «sent to» state lives in sessionStorage (residual Б4-М5). */
export function CodeEnter({ onOtherEmail }: { onOtherEmail: () => void }) {
  const { t } = useTranslation()
  const [sent, setSent] = useState(() => readCodeSent())
  const [code, setCode] = useState('')
  const [verifying, setVerifying] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [resending, setResending] = useState(false)
  const left = useCountdown(sent?.at ?? null)

  if (!sent) return <CodeRequest reset={false} onSent={() => setSent(readCodeSent())} />

  async function submit(e: FormEvent) {
    e.preventDefault()
    if (!sent) return
    if (!isValidCode(code)) return setError(t('auth.codeInvalid'))
    setVerifying(true)
    setError(null)
    try {
      const { error: verifyError } = await supabase.auth.verifyOtp({ email: sent.email, token: code, type: 'email' })
      if (verifyError) {
        setError(t('auth.codeInvalid'))
        return
      }
      clearCodeSent()
    } catch {
      setError(t('auth.network'))
    } finally {
      setVerifying(false)
    }
  }

  async function resend() {
    if (!sent) return
    setResending(true)
    const result = await sendCode(sent.email)
    setResending(false)
    if (result.ok) setSent(readCodeSent())
    else setError(result.error === 'retryAfter' ? t('auth.retryAfter', { count: result.wait ?? 60 }) : t(`auth.${result.error}`))
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-5" noValidate>
      <h1 className="m-0 text-h1 text-fg">{t('auth.signInWithCode')}</h1>
      <p className="m-0 text-body text-fg" role="status">
        {t('auth.neutralSent')} <span className="font-semibold break-all">{sent.email}</span>
      </p>
      <CodeField
        label={t('auth.code')}
        hint={t('auth.codeHint')}
        value={code}
        onValue={setCode}
        error={error}
        disabled={verifying}
        autoFocus
      />
      <Button type="submit" block loading={verifying}>{t('auth.signInWithCodeSubmit')}</Button>
      <Button variant="secondary" block loading={resending} disabled={left > 0} onClick={() => void resend()}>
        {left > 0 ? t('auth.resendIn', { count: left }) : t('auth.resend')}
      </Button>
      <Button
        variant="ghost"
        block
        onClick={() => {
          clearCodeSent()
          onOtherEmail()
        }}
      >
        {t('auth.otherEmail')}
      </Button>
    </form>
  )
}

/**
 * 03 §3.4 `login-invite-code` (residual Б4-HIGH): the invitation letter's code
 * goes through `verifyOtp({ email, token, type: 'invite' })`, so the first
 * sign-in does not depend on a PKCE link opened in the right browser.
 */
export function InviteCode({ prefilledEmail, onSignedIn }: { prefilledEmail: string | null; onSignedIn: () => void }) {
  const { t } = useTranslation()
  const [fixedEmail, setFixedEmail] = useState(prefilledEmail && isValidEmail(prefilledEmail) ? prefilledEmail.trim() : null)
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [verifying, setVerifying] = useState(false)
  const [emailError, setEmailError] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function submit(e: FormEvent) {
    e.preventDefault()
    const address = (fixedEmail ?? email).trim()
    if (!isValidEmail(address)) return setEmailError(true)
    setEmailError(false)
    if (!isValidCode(code)) return setError(t('auth.checkEmailAndCode'))
    setVerifying(true)
    setError(null)
    try {
      const { error: verifyError } = await supabase.auth.verifyOtp({ email: address, token: code, type: 'invite' })
      if (verifyError) {
        setError(t('auth.checkEmailAndCode'))
        return
      }
      saveLastEmail(address)
      onSignedIn()
    } catch {
      setError(t('auth.network'))
    } finally {
      setVerifying(false)
    }
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-5" noValidate>
      <h1 className="m-0 text-h1 text-fg">{t('auth.inviteTitle')}</h1>
      {fixedEmail ? (
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="text-field font-semibold text-fg">{maskEmail(fixedEmail)}</span>
          <Button variant="ghost" onClick={() => setFixedEmail(null)}>{t('auth.otherEmail')}</Button>
        </div>
      ) : (
        <TextField
          label={t('auth.inviteEmailLabel')}
          type="email"
          inputMode="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          error={emailError ? t('auth.emailInvalid') : null}
          disabled={verifying}
        />
      )}
      <CodeField label={t('auth.code')} hint={t('auth.codeHint')} value={code} onValue={setCode} error={error} disabled={verifying} />
      <Button type="submit" block loading={verifying}>{t('auth.signInWithCodeSubmit')}</Button>
      <p className="m-0 text-body text-fg">{t('auth.openInBrowser')}</p>
      <Link to={passwordLink} className={buttonClass({ variant: 'ghost', block: true })}>{t('auth.signInPassword')}</Link>
    </form>
  )
}

/**
 * 03 §3.5 `login-link-error`. Gate open: «Пришлём новый» + send code, or enter
 * the code. Gate closed: only «Код или ссылка устарели.» and the password form
 * (no promise of a new letter). Two ways out, always.
 */
export function LinkErrorScreen({ kind, gateOpen, onDismiss }: { kind: LinkError; gateOpen: boolean; onDismiss: (to: 'code' | 'enter' | 'password') => void }) {
  const { t } = useTranslation()
  if (!gateOpen) {
    return (
      <div className="flex flex-col gap-5">
        <ErrorMessage message={t('auth.linkExpired')} />
        <Button block onClick={() => onDismiss('password')}>{t('auth.signInPassword')}</Button>
      </div>
    )
  }
  return (
    <div className="flex flex-col gap-5">
      <ErrorMessage message={kind === 'otherBrowser' ? t('auth.linkOtherBrowser') : `${t('auth.linkExpired')} ${t('auth.linkExpiredResend')}`} />
      <p className="m-0 text-body text-fg">{t('auth.openInBrowser')}</p>
      <Button block onClick={() => onDismiss('code')}>{t('auth.sendCode')}</Button>
      {readCodeSent() ? (
        <Button variant="secondary" block onClick={() => onDismiss('enter')}>{t('auth.code')}</Button>
      ) : null}
      <Button variant="ghost" block onClick={() => onDismiss('password')}>{t('auth.signInPassword')}</Button>
    </div>
  )
}

/** 03 §3.6 `auth-set-password`: optional, after an invitation code or a reset code. */
export function SetPassword({ onDone }: { onDone: () => void }) {
  const { t } = useTranslation()
  const [password, setPassword] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function submit(e: FormEvent) {
    e.preventDefault()
    if (password.length < MIN_PASSWORD) return setError(t('auth.passwordTooShort', { min: MIN_PASSWORD }))
    setSaving(true)
    setError(null)
    try {
      const { error: updateError } = await supabase.auth.updateUser({ password })
      if (updateError) {
        setError(t('common.unexpectedError'))
        return
      }
      onDone()
    } catch {
      setError(t('auth.network'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-5" noValidate>
      <h1 className="m-0 text-h1 text-fg">{t('auth.setPasswordTitle')}</h1>
      <PasswordField
        label={t('auth.newPassword', { min: MIN_PASSWORD })}
        autoComplete="new-password"
        value={password}
        onValue={setPassword}
        error={error}
        disabled={saving}
      />
      <Button type="submit" block loading={saving}>{t('auth.savePassword')}</Button>
      <Button variant="ghost" block onClick={onDone} disabled={saving}>{t('auth.skipUseCode')}</Button>
    </form>
  )
}
