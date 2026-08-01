import { useState, useEffect, useCallback } from 'react'

export interface AuthUser {
  id: string
  name: string
  role: 'manager' | 'sales_rep'
}

export function useAuth() {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/auth/me', { credentials: 'include' })
      .then((r) => r.json())
      .then((d) => {
        if (d.success && d.data) {
          setUser(d.data)
        }
      })
      .catch(() => {
        // Silently fail — user stays null
      })
      .finally(() => setLoading(false))
  }, [])

  const login = useCallback(() => {
    window.location.href = '/api/auth/line'
  }, [])

  const logout = useCallback(async () => {
    await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' })
    setUser(null)
  }, [])

  return { user, loading, login, logout }
}
