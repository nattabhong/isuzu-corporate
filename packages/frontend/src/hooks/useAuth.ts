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

const API_BASE = import.meta.env.VITE_API_URL || 'https://sala-corporate-api.nattabhong-kon.workers.dev'

async function safeFetchJson(path: string, options: RequestInit = {}) {
  const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null
  const headers: Record<string, string> = options.headers ? { ...(options.headers as Record<string, string>) } : {}
  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }

  const mergedOptions: RequestInit = {
    ...options,
    ...(Object.keys(headers).length > 0 ? { headers } : {}),
  }

  let res: Response
  try {
    res = await fetch(path, mergedOptions)
  } catch {
    const fullUrl = path.startsWith('/') ? `${API_BASE}${path}` : path
    res = await fetch(fullUrl, mergedOptions)
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
      body: JSON.stringify({ email: email.trim(), password }),
    })
    if (!ok || !data?.success) {
      throw new Error(data?.error || 'อีเมลหรือรหัสผ่านไม่ถูกต้อง')
    }
    if (data.data?.token) {
      localStorage.setItem('auth_token', data.data.token)
      api.setToken(data.data.token)
    }
    setUser(data.data)
    return data.data as AuthUser
  }, [])

  const register = useCallback(async (name: string, email: string, password: string, inviteCode: string) => {
    const { ok, data } = await safeFetchJson('/api/auth/register', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: name.trim(), email: email.trim(), password, inviteCode: inviteCode.trim() }),
    })
    if (!ok || !data?.success) {
      throw new Error(data?.error || 'สมัครสมาชิกไม่สำเร็จ')
    }
    if (data.data?.token) {
      localStorage.setItem('auth_token', data.data.token)
      api.setToken(data.data.token)
    }
    setUser(data.data)
    return data.data as AuthUser
  }, [])

  const logout = useCallback(async () => {
    await safeFetchJson('/api/auth/logout', { method: 'POST', credentials: 'include' })
    localStorage.removeItem('auth_token')
    api.clearToken()
    setUser(null)
  }, [])

  return { user, loading, lineLogin, login, register, logout }
}
