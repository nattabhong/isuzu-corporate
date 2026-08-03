import { useState, useEffect, useCallback } from 'react'
import { api } from '../lib/api'

export interface AuthUser {
  id: string
  name: string
  role: 'admin' | 'manager' | 'sales_rep'
  email?: string
  phone?: string
  territory?: string
}

// Always use the absolute API URL — never rely on relative path proxying
const API_BASE = (import.meta.env.VITE_API_URL as string) || ''

async function apiFetch(path: string, options: RequestInit = {}) {
  const token =
    typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null

  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string>),
  }
  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }

  const url = `${API_BASE}${path}`

  const reqOptions: RequestInit = { ...options }
  if (Object.keys(headers).length > 0) {
    reqOptions.headers = headers
  }

  const res = await fetch(url, reqOptions)

  let data: unknown = null
  const text = await res.text().catch(() => '')
  if (text) {
    try {
      data = JSON.parse(text)
    } catch {
      data = { error: text }
    }
  }

  return { ok: res.ok, status: res.status, data: data as Record<string, unknown> }
}

export function useAuth() {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    apiFetch('/api/auth/me', { credentials: 'include' })
      .then(({ ok, data }) => {
        if (ok && (data as any)?.success && (data as any)?.data) {
          setUser((data as any).data)
        } else {
          setUser(null)
          if (typeof window !== 'undefined') localStorage.removeItem('auth_token')
        }
      })
      .catch(() => {
        setUser(null)
        if (typeof window !== 'undefined') localStorage.removeItem('auth_token')
      })
      .finally(() => setLoading(false))
  }, [])

  const lineLogin = useCallback(() => {
    window.location.href = `${API_BASE}/api/auth/line`
  }, [])

  const login = useCallback(async (email: string, password: string) => {
    const { ok, data } = await apiFetch('/api/auth/login', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: email.trim(), password: password.trim() }),
    })
    if (!ok || !(data as any)?.success) {
      throw new Error((data as any)?.error || 'อีเมลหรือรหัสผ่านไม่ถูกต้อง')
    }
    const userData = (data as any).data
    if (userData?.token) {
      localStorage.setItem('auth_token', userData.token)
      api.setToken(userData.token)
    }
    setUser(userData)
    return userData as AuthUser
  }, [])

  const register = useCallback(
    async (name: string, email: string, password: string, inviteCode: string) => {
      const { ok, data } = await apiFetch('/api/auth/register', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          password,
          inviteCode: inviteCode.trim(),
        }),
      })
      if (!ok || !(data as any)?.success) {
        throw new Error((data as any)?.error || 'สมัครสมาชิกไม่สำเร็จ')
      }
      const userData = (data as any).data
      if (userData?.token) {
        localStorage.setItem('auth_token', userData.token)
        api.setToken(userData.token)
      }
      setUser(userData)
      return userData as AuthUser
    },
    [],
  )

  const logout = useCallback(async () => {
    await apiFetch('/api/auth/logout', { method: 'POST', credentials: 'include' }).catch(
      () => {},
    )
    localStorage.removeItem('auth_token')
    api.clearToken()
    setUser(null)
  }, [])

  return { user, loading, lineLogin, login, register, logout }
}
