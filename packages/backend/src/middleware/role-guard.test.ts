import { describe, it, expect } from 'vitest'
import { Hono } from 'hono'
import { SignJWT } from 'jose'
import { requireManager } from './role-guard.js'
import { authMiddleware, type AuthUser } from './auth.js'

// Create a test app that chains auth middleware + role guard
function createTestApp() {
  const app = new Hono<{ Bindings: { JWT_SECRET: string }; Variables: { user: AuthUser } }>()
  app.use('/manager-only/*', authMiddleware)
  app.use('/manager-only/*', requireManager)
  app.get('/manager-only/action', (c) => {
    return c.json({ success: true, message: 'manager action done' })
  })
  return app
}

async function createTestToken(role: 'manager' | 'sales_rep'): Promise<string> {
  const secret = 'test-jwt-secret-role-guard'
  return new SignJWT({ id: 'user-1', role, name: 'Test User' })
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime('1h')
    .setIssuedAt()
    .sign(new TextEncoder().encode(secret))
}

describe('requireManager middleware', () => {
  it('rejects sales_rep with 403', async () => {
    const app = createTestApp()
    const token = await createTestToken('sales_rep')

    const res = await app.request('/manager-only/action', {
      headers: { Authorization: `Bearer ${token}` }
    }, { JWT_SECRET: 'test-jwt-secret-role-guard' })

    expect(res.status).toBe(403)
    const body = await res.json() as { success: boolean; error: string }
    expect(body.success).toBe(false)
    expect(body.error).toBeDefined()
  })

  it('passes manager with 200', async () => {
    const app = createTestApp()
    const token = await createTestToken('manager')

    const res = await app.request('/manager-only/action', {
      headers: { Authorization: `Bearer ${token}` }
    }, { JWT_SECRET: 'test-jwt-secret-role-guard' })

    expect(res.status).toBe(200)
    const body = await res.json() as { success: boolean; message: string }
    expect(body.success).toBe(true)
    expect(body.message).toBe('manager action done')
  })
})
