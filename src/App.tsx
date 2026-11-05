import { lazy, Suspense } from 'react'
import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { Landing } from './pages/Landing'

const AuthenticatedRoutes = lazy(() => import('./routes/AuthenticatedRoutes'))

export default function App() {
  return <BrowserRouter>
    <Suspense fallback={null}>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="*" element={<AuthenticatedRoutes />} />
      </Routes>
    </Suspense>
  </BrowserRouter>
}
