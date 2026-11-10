import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../hooks/useAuth'
import { CenteredCard } from '../components/CenteredCard'
import { Button } from '../components/Button'

/**
 * Signed in, but the `profiles` row is missing or incomplete (see
 * isProfileConfigured). After self sign-up this is the normal state until the
 * company exists.
 *
 * TODO(C0): once Codex ships `create_company_and_profile`
 * (docs/contracts/onboarding.md), sign-up calls it and this screen only shows
 * when that call failed. Until then we set the company up by hand.
 */
export function ProfileNotConfigured() {
  const { user, signOut, refreshProfile } = useAuth()
  const { t } = useTranslation()
  const [checking, setChecking] = useState(false)

  async function checkAgain() {
    setChecking(true)
    try {
      await refreshProfile()
    } finally {
      setChecking(false)
    }
  }

  return (
    <CenteredCard>
      <h1 className="text-lg font-semibold text-slate-900">{t('onboarding.title')}</h1>
      <p className="text-sm text-slate-600">{t('onboarding.text')}</p>
      {user?.email ? (
        <p className="text-xs text-slate-500">{t('auth.signedInAs', { email: user.email })}</p>
      ) : null}
      <Button className="w-full" loading={checking} onClick={() => void checkAgain()}>
        {t('onboarding.checkAgain')}
      </Button>
      <Button variant="secondary" className="w-full" onClick={() => void signOut()}>
        {t('common.signOut')}
      </Button>
      <Link to="/" className="block text-center text-sm text-slate-500 underline underline-offset-2">
        {t('auth.backHome')}
      </Link>
    </CenteredCard>
  )
}
