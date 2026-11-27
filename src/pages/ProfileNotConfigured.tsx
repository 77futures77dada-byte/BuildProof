import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../hooks/useAuth'
import { Button, buttonClass } from '../components/ui'
import { AuthScreen } from '../components/AuthScreen'
import { createCompanyForSelf, needsCompany } from '../lib/profile'
import { legalContact } from '../lib/emailGate'
import { currentLocale } from '../i18n'

/**
 * 03 §3.9: shown only when `create_company_and_profile` failed (ProtectedRoute
 * calls it for a self sign-up). «Проверить снова» repeats the call — it is
 * idempotent on the server — and reloads the profile.
 */
export function ProfileNotConfigured() {
  const { user, profile, signOut, refreshProfile } = useAuth()
  const { t } = useTranslation()
  const [checking, setChecking] = useState(false)
  const contact = legalContact()

  async function checkAgain() {
    setChecking(true)
    try {
      if (needsCompany(profile)) await createCompanyForSelf(currentLocale()).catch((err) => console.warn('create_company_and_profile failed:', err))
      await refreshProfile()
    } finally {
      setChecking(false)
    }
  }

  return (
    <AuthScreen>
      <h1 className="m-0 text-h1 text-fg">{t('onboarding.title')}</h1>
      <p className="m-0 text-body text-fg">{t('onboarding.text')}</p>
      {user?.email ? <p className="m-0 text-body text-fg">{t('auth.signedInAs', { email: user.email })}</p> : null}
      <Button block loading={checking} onClick={() => void checkAgain()}>
        {t('onboarding.checkAgain')}
      </Button>
      <Button variant="secondary" block onClick={() => void signOut()}>
        {t('common.signOut')}
      </Button>
      {contact.email ? (
        <p className="m-0 text-body text-fg">
          <a href={`mailto:${contact.email}`} className="inline-flex min-h-12 items-center text-link underline underline-offset-4">
            {t('onboarding.contact', { email: contact.email })}
          </a>
        </p>
      ) : null}
      <Link to="/" className={buttonClass({ variant: 'ghost', block: true })}>
        {t('auth.backHome')}
      </Link>
    </AuthScreen>
  )
}
