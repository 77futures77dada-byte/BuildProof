import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../hooks/useAuth'
import { buttonClass } from '../components/ui'
import { AuthScreen } from '../components/AuthScreen'

/** 03 §3.11: no main button; with a session «К объектам», without — «Войти» and «На главную». */
export function NotFound() {
  const { t } = useTranslation()
  const { session, loading } = useAuth()
  return (
    <AuthScreen>
      <h1 className="m-0 text-h1 text-fg">404</h1>
      <p className="m-0 text-body text-fg">{t('notFound.text')}</p>
      {loading ? null : session ? (
        <Link to="/dashboard" className={buttonClass({ variant: 'secondary', block: true })}>
          {t('notFound.toProjects')}
        </Link>
      ) : (
        <div className="flex flex-col gap-3">
          <Link to="/login" className={buttonClass({ variant: 'secondary', block: true })}>
            {t('common.signIn')}
          </Link>
          <Link to="/" className={buttonClass({ variant: 'ghost', block: true })}>
            {t('notFound.home')}
          </Link>
        </div>
      )}
    </AuthScreen>
  )
}
