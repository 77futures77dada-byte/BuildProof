import { useState } from 'react'
import type { FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { Button, TextField } from './ui'
import { AuthScreen } from './AuthScreen'
import { saveFullName } from '../lib/profile'

/**
 * 03 §3.10 `onboarding-name`: optional, once after the company was created
 * when `profiles.full_name` is empty. «Позже» skips it.
 */
export function OnboardingName({ userId, onDone }: { userId: string; onDone: (saved: boolean) => void }) {
  const { t } = useTranslation()
  const [name, setName] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function submit(e: FormEvent) {
    e.preventDefault()
    if (!name.trim()) return onDone(false)
    setSaving(true)
    setError(null)
    try {
      await saveFullName(userId, name)
      onDone(true)
    } catch (err) {
      console.warn('save full_name failed:', err)
      setError(t('common.unexpectedError'))
      setSaving(false)
    }
  }

  return (
    <AuthScreen>
      <h1 className="m-0 text-h1 text-fg">{t('profile.title')}</h1>
      <form onSubmit={submit} className="flex flex-col gap-5" noValidate>
        <TextField
          label={t('profile.name')}
          hint={t('profile.hint')}
          autoComplete="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          error={error}
          disabled={saving}
        />
        <Button type="submit" block loading={saving}>{t('common.save')}</Button>
        <Button variant="ghost" block onClick={() => onDone(false)} disabled={saving}>{t('common.later')}</Button>
      </form>
    </AuthScreen>
  )
}
