import { AuthProvider } from '../components/AuthProvider'
import { ProtectedRoute } from '../components/ProtectedRoute'
import { ProjectLayout } from '../components/ProjectLayout'
import { Login } from '../pages/Login'
import { Dashboard } from '../pages/Dashboard'
import { ProjectHome } from '../pages/ProjectHome'
import { Today } from '../pages/Today'
import { Stages } from '../pages/Stages'
import { Photos } from '../pages/Photos'
import { Tasks } from '../pages/Tasks'
import { Issues } from '../pages/Issues'
import { Settings } from '../pages/Settings'
import { NotFound } from '../pages/NotFound'
import { Tariff } from '../pages/Tariff'
import { Route, Routes } from 'react-router-dom'

export default function AuthenticatedRoutes() {
  return <AuthProvider>
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
      <Route path="/tariff" element={<ProtectedRoute><Tariff /></ProtectedRoute>} />
      <Route path="/project/:id" element={<ProtectedRoute><ProjectLayout /></ProtectedRoute>}>
        <Route index element={<ProjectHome />} />
        <Route path="today" element={<Today />} />
        <Route path="stages" element={<Stages />} />
        <Route path="photos" element={<Photos />} />
        <Route path="tasks" element={<Tasks />} />
        <Route path="issues" element={<Issues />} />
        <Route path="settings" element={<Settings />} />
      </Route>
      <Route path="*" element={<NotFound />} />
    </Routes>
  </AuthProvider>
}
