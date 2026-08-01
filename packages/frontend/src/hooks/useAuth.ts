import { useState, useEffect, useCallback } from 'react'

export interface AuthUser {
  id: string
  name: string
  role: 'admin' | 'manager' | 'sales_rep'
  email?: string
  phone?: string
  territory?: string
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

  const lineLogin = useCallback(() => {
    window.location.href = '/api/auth/line'
  }, [])

  const login = useCallback(async (email: string, password: string) => {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    })
    const data = await res.json()
    if (!res.ok || !data.success) {
      throw new Error(data.error || 'เข้าสู่ระบบไม่สำเร็จ')
    }
    setUser(data.data)
    return data.data as AuthUser
  }, [])

  const register = useCallback(async (name: string, email: string, password: string, inviteCode: string) => {
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password, inviteCode }),
    })
    const data = await res.json()
    if (!res.ok || !data.success) {
      throw new Error(data.error || 'สมัครสมาชิกไม่สำเร็จ')
    }
    setUser(data.data)
    return data.data as AuthUser
  }, [])

  const logout = useCallback(async () => {
    await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' })
    setUser(null)
  }, [])

  return { user, loading, lineLogin, login, register, logout }
}
