import { createMiddleware } from 'hono/factory'
import { getCookie } from 'hono/cookie'
import { jwtVerify } from 'jose'

export interface AuthUser {
  id: string
  role: 'manager' | 'sales_rep'
  name: string
}

export const authMiddleware = createMiddleware<{
  Bindings: { JWT_SECRET: string }
  Variables: { user: AuthUser }
}>(async (c, next) => {
  const token = c.req.header('Authorization')?.replace('Bearer ', '')
    ?? getCookie(c, 'token')

  if (!token) {
    return c.json({ success: false, error: 'กรุณาเข้าสู่ระบบ' }, 401)
  }

  try {
    const jwtSecret = c.env.JWT_SECRET || 'sala-corporate-secret-jwt-key-2026-secure'
    const secret = new TextEncoder().encode(jwtSecret)
    const { payload } = await jwtVerify(token, secret)
    // Runtime validation of JWT payload shape
    if (
      typeof payload.id !== 'string' ||
      typeof payload.name !== 'string' ||
      (payload.role !== 'manager' && payload.role !== 'sales_rep')
    ) {
      return c.json({ success: false, error: 'โทเค็นไม่ถูกต้อง' }, 401)
    }
    c.set('user', payload as unknown as AuthUser)
    await next()
  } catch {
    return c.json({ success: false, error: 'เซสชันหมดอายุ กรุณาเข้าสู่ระบบใหม่' }, 401)
  }
})
