import { useTranslation } from 'react-i18next'
import { useAuth } from '../hooks/useAuth'
import { CenteredCard } from '../components/CenteredCard'
import { Button } from '../components/Button'

/**
 * Shown when the user is authenticated but their `profiles` row is missing or
 * incomplete (see isProfileConfigured). There is no self-service registration —
 * an administrator provisions accounts — so the only action here is to sign out.
 */
export function ProfileNotConfigured() {
  const { user, signOut } = useAuth()
  const { t } = useTranslation()

  return (
    <CenteredCard>
      <h1 className="text-lg font-semibold text-slate-900">{t('auth.notConfiguredTitle')}</h1>
      <p className="text-sm text-slate-600">
        {t('auth.notConfiguredText')}
      </p>
      {user?.email ? (
        <p className="text-xs text-slate-400">{t('auth.signedInAs', { email: user.email })}</p>
      ) : null}
      <Button variant="secondary" className="w-full" onClick={() => void signOut()}>
        {t('common.signOut')}
      </Button>
    </CenteredCard>
  )
}
