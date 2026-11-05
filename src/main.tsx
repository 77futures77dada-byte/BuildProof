// oxlint-disable react/only-export-components -- this is the application entry point.
import { lazy, StrictMode, Suspense } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './i18n'

const App = lazy(() => import('./App.tsx'))

// On the landing, fetch its chunk alongside App instead of after it (one round
// trip less before the hero paints). App's own lazy import reuses this request.
if (window.location.pathname === '/') void import('./features/landing/LandingPage')

const House3DDevPage = import.meta.env.DEV
  ? lazy(() => import('./features/house3d/House3DDevPage'))
  : null

const root = createRoot(document.getElementById('root')!)
if (House3DDevPage && window.location.pathname === '/dev/house-3d') {
  root.render(<Suspense fallback={null}><House3DDevPage /></Suspense>)
} else {
  root.render(<StrictMode><App /></StrictMode>)
}
