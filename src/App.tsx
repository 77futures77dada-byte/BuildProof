import { lazy, Suspense } from 'react'
import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { ThemeRoot } from './components/ui/ThemeRoot'
import { AppLoading } from './components/AppLoading'

// The public landing and the signed-in app are separate chunks: visitors on `/`
// never download Supabase or the app screens.
const LandingPage = lazy(() => import('./features/landing/LandingPage').then((m) => ({ default: m.LandingPage })))
const AuthenticatedRoutes = lazy(() => import('./routes/AuthenticatedRoutes'))
// Link pages (worker / client by link): no AuthProvider, no Supabase session.
const WorkerLinkPage = lazy(() => import('./pages/WorkerLink'))
const ClientViewPage = lazy(() => import('./pages/ClientView'))

export default function App() {
  return <BrowserRouter>
    <ThemeRoot>
      <Suspense fallback={<AppLoading />}>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/w" element={<WorkerLinkPage />} />
          <Route path="/c" element={<ClientViewPage />} />
          <Route path="*" element={<AuthenticatedRoutes />} />
        </Routes>
      </Suspense>
    </ThemeRoot>
  </BrowserRouter>
}
