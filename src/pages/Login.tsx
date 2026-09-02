import { useState } from 'react'
import type { FormEvent } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import { toErrorMessage } from '../lib/format'
import { useAuth } from '../hooks/useAuth'
import { Button } from '../components/Button'
import { TextField } from '../components/TextField'
import { ErrorMessage } from '../components/ErrorMessage'
import { FullPageSpinner } from '../components/Spinner'

interface LocationState {
  from?: { pathname: string }
}

export function Login() {
  const { session, loading: authLoading } = useAuth()
  const location = useLocation()
  const redirectTo = (location.state as LocationState | null)?.from?.pathname ?? '/dashboard'

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (authLoading) return <FullPageSpinner />
  if (session) return <Navigate to={redirectTo} replace />

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setSubmitting(true)
    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      })
      if (signInError) {
        setError(
          signInError.message === 'Invalid login credentials'
            ? 'Неверный email или пароль.'
            : toErrorMessage(signInError),
        )
        return
      }
      // On success the auth listener updates context and the <Navigate> above
      // takes over on the next render.
    } catch (err) {
      setError(toErrorMessage(err))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="flex min-h-svh items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-semibold text-slate-900">BuildProof</h1>
          <p className="mt-1 text-sm text-slate-500">Вход в личный кабинет</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <TextField
            label="Email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={submitting}
          />
          <TextField
            label="Пароль"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={submitting}
          />

          <ErrorMessage message={error} />

          <Button type="submit" loading={submitting} className="w-full">
            Войти
          </Button>
        </form>
      </div>
    </div>
  )
}
