import { Link } from 'react-router-dom'

export function NotFound() {
  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-3 p-6 text-center">
      <p className="text-3xl font-semibold text-slate-900">404</p>
      <p className="text-sm text-slate-500">Такой страницы нет.</p>
      <Link
        to="/dashboard"
        className="text-sm font-medium text-sky-700 underline underline-offset-2"
      >
        На главную
      </Link>
    </div>
  )
}
