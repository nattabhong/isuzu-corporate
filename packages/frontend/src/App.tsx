import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './hooks/useAuth'
import { Login } from './pages/Login'
import { Dashboard } from './pages/Dashboard'

export default function App() {
  const { user, loading, login, lineLogin, register, logout } = useAuth()

  if (loading) {
    return (
      <div className="app-loading">
        <p>กำลังโหลด...</p>
      </div>
    )
  }

  if (!user) {
    return <Login onLogin={login} onLineLogin={lineLogin} onRegister={register} />
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/*" element={<Dashboard user={user} onLogout={logout} />} />
      </Routes>
    </BrowserRouter>
  )
}
