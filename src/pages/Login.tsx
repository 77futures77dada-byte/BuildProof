import { PagePlaceholder } from '../components/PagePlaceholder'

export function Login() {
  // Real email/password sign-in is added with the auth feature.
  return (
    <div className="mx-auto max-w-sm p-6">
      <PagePlaceholder title="Вход" description="Авторизация по email и паролю" />
    </div>
  )
}
