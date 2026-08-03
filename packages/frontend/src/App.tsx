import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './hooks/useAuth'
import { Login } from './pages/Login'
import { Dashboard } from './pages/Dashboard'

function AppRoutes() {
  const { user, loading, login, lineLogin, register, logout } = useAuth()

  if (loading) {
    return (
      <div className="app-loading">
        <p>กำลังโหลด...</p>
      </div>
    )
  }

  if (!user) {
    return (
      <Routes>
        <Route path="*" element={<Login onLogin={login} onLineLogin={lineLogin} onRegister={register} />} />
      </Routes>
    )
  }

  return (
    <Routes>
      <Route path="/login" element={<Navigate to="/calendar" replace />} />
      <Route path="/*" element={<Dashboard user={user} onLogout={logout} />} />
    </Routes>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  )
}
