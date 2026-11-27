import { useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../hooks/useAuth'
import { createCompanyForSelf, isProfileConfigured, needsCompany } from '../lib/profile'
import { currentLocale } from '../i18n'
import { ProfileNotConfigured } from '../pages/ProfileNotConfigured'
import { AppLoading } from './AppLoading'
import { AuthScreen } from './AuthScreen'
import { OnboardingName } from './OnboardingName'
import { Button } from './ui'
import { ErrorMessage } from './ErrorMessage'

type Onboarding = 'idle' | 'creating' | 'failed' | 'askName' | 'done'

/**
 * Gate for authenticated routes (03 §3.7–§3.10). While the session resolves:
 * `app-loading`. No session: /login (password form when the e-mail gate is
 * closed, residual Б4-М4), keeping `from`. Profile query failed:
 * `profile-load-error`. A self sign-up without a company: the company is
 * created here (`creating-company`), then the optional «Как вас зовут?»; if
 * the RPC fails — `profile-not-configured`.
 */
export function ProtectedRoute({ children }: { children: ReactNode }) {
  const { session, profile, loading, error, refreshProfile, signOut } = useAuth()
  const location = useLocation()
  const { t } = useTranslation()
  const [onboarding, setOnboarding] = useState<Onboarding>('idle')
  const [retrying, setRetrying] = useState(false)
  const started = useRef(false)

  const mustCreate = !loading && !!session && !error && needsCompany(profile)

  useEffect(() => {
    if (!mustCreate || started.current) return
    started.current = true
    setOnboarding('creating')
    createCompanyForSelf(currentLocale())
      .then(() => refreshProfile())
      .then(() => setOnboarding('askName'))
      .catch((err) => {
        console.warn('create_company_and_profile failed:', err)
        setOnboarding('failed')
      })
  }, [mustCreate, refreshProfile])

  if (loading) return <AppLoading />

  if (!session) {
    return <Navigate to="/login" replace state={{ from: location }} />
  }

  if (error) {
    return (
      <AuthScreen>
        <ErrorMessage message={t('auth.profileLoadFailed')} />
        <Button
          variant="secondary"
          block
          loading={retrying}
          onClick={() => {
            setRetrying(true)
            void refreshProfile().finally(() => setRetrying(false))
          }}
        >
          {t('common.retry')}
        </Button>
        <Button variant="ghost" block onClick={() => void signOut()}>{t('common.signOut')}</Button>
      </AuthScreen>
    )
  }

  if (onboarding === 'creating') return <AppLoading />

  if (!isProfileConfigured(profile)) {
    return <ProfileNotConfigured />
  }

  if (onboarding === 'askName' && !profile.full_name) {
    return (
      <OnboardingName
        userId={profile.id}
        onDone={(saved) => {
          setOnboarding('done')
          if (saved) void refreshProfile()
        }}
      />
    )
  }

  return <>{children}</>
}
