import { useState, useEffect, useCallback } from 'react'

export interface AuthUser {
  id: string
  name: string
  role: 'admin' | 'manager' | 'sales_rep'
  email?: string
  phone?: string
  territory?: string
}

const API_BASE = import.meta.env.VITE_API_URL || 'https://sala-corporate-api.nattabhong-kon.workers.dev'

async function safeFetchJson(path: string, options: RequestInit = {}) {
  let res: Response
  try {
    res = await fetch(path, options)
  } catch {
    // If relative path fails, try absolute backend API URL
    const fullUrl = path.startsWith('/') ? `${API_BASE}${path}` : path
    res = await fetch(fullUrl, options)
  }

  const text = await res.text().catch(() => '')
  let data: any = null
  if (text) {
    try {
      data = JSON.parse(text)
    } catch {
      data = { error: text }
    }
  }

  return { ok: res.ok, status: res.status, data }
}

export function useAuth() {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    safeFetchJson('/api/auth/me', { credentials: 'include' })
      .then(({ ok, data }) => {
        if (ok && data?.success && data?.data) {
          setUser(data.data)
        }
      })
      .catch(() => {
        // Silently fail
      })
      .finally(() => setLoading(false))
  }, [])

  const lineLogin = useCallback(() => {
    window.location.href = '/api/auth/line'
  }, [])

  const login = useCallback(async (email: string, password: string) => {
    const { ok, data } = await safeFetchJson('/api/auth/login', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    })
    if (!ok || !data?.success) {
      throw new Error(data?.error || 'อีเมลหรือรหัสผ่านไม่ถูกต้อง')
    }
    setUser(data.data)
    return data.data as AuthUser
  }, [])

  const register = useCallback(async (name: string, email: string, password: string, inviteCode: string) => {
    const { ok, data } = await safeFetchJson('/api/auth/register', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password, inviteCode }),
    })
    if (!ok || !data?.success) {
      throw new Error(data?.error || 'สมัครสมาชิกไม่สำเร็จ')
    }
    setUser(data.data)
    return data.data as AuthUser
  }, [])

  const logout = useCallback(async () => {
    await safeFetchJson('/api/auth/logout', { method: 'POST', credentials: 'include' })
    setUser(null)
  }, [])

  return { user, loading, lineLogin, login, register, logout }
}
