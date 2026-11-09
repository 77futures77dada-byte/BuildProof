import { lazy, Suspense } from 'react'
import { BrowserRouter, Route, Routes } from 'react-router-dom'

// The public landing and the signed-in app are separate chunks: visitors on `/`
// never download Supabase or the app screens.
const LandingPage = lazy(() => import('./features/landing/LandingPage').then((m) => ({ default: m.LandingPage })))
const AuthenticatedRoutes = lazy(() => import('./routes/AuthenticatedRoutes'))

export default function App() {
  return <BrowserRouter>
    <Suspense fallback={null}>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="*" element={<AuthenticatedRoutes />} />
      </Routes>
    </Suspense>
  </BrowserRouter>
}
