import { describe, it, expect, beforeAll } from 'vitest'
import { Hono } from 'hono'
import { SignJWT } from 'jose'
import { authMiddleware, type AuthUser } from './auth.js'

// Create a minimal Hono app that uses the auth middleware
function createTestApp() {
  const app = new Hono<{ Bindings: { JWT_SECRET: string }; Variables: { user: AuthUser } }>()
  app.use('/protected/*', authMiddleware)
  app.get('/protected/test', (c) => {
    const user = c.get('user')
    return c.json({ success: true, data: user })
  })
  return app
}

// Generate a valid JWT for testing
async function createTestToken(
  payload: AuthUser,
  secret: string,
): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime('1h')
    .setIssuedAt()
    .sign(new TextEncoder().encode(secret))
}

const TEST_SECRET = 'test-jwt-secret-for-unit-tests-do-not-use-in-prod'
let validToken: string

describe('authMiddleware', () => {
  beforeAll(async () => {
    validToken = await createTestToken(
      { id: 'user-1', role: 'manager', name: 'Test Manager' },
      TEST_SECRET,
    )
  })

  it('rejects missing token with 401', async () => {
    const app = createTestApp()
    const res = await app.request('/protected/test', {
      headers: {}
    }, { JWT_SECRET: TEST_SECRET })

    expect(res.status).toBe(401)
    const body = await res.json() as { success: boolean; error: string }
    expect(body.success).toBe(false)
    expect(body.error).toBeDefined()
  })

  it('rejects invalid token with 401', async () => {
    const app = createTestApp()
    const res = await app.request('/protected/test', {
      headers: { Authorization: 'Bearer invalid-token-that-cannot-be-verified' }
    }, { JWT_SECRET: TEST_SECRET })

    expect(res.status).toBe(401)
    const body = await res.json() as { success: boolean }
    expect(body.success).toBe(false)
  })

  it('passes valid JWT and sets user context', async () => {
    const app = createTestApp()
    const res = await app.request('/protected/test', {
      headers: { Authorization: `Bearer ${validToken}` }
    }, { JWT_SECRET: TEST_SECRET })

    expect(res.status).toBe(200)
    const body = await res.json() as { success: boolean; data: AuthUser }
    expect(body.success).toBe(true)
    expect(body.data).toMatchObject({
      id: 'user-1',
      role: 'manager',
      name: 'Test Manager',
    })
  })

  it('reads token from cookie when Authorization header is absent', async () => {
    const app = createTestApp()
    const res = await app.request('/protected/test', {
      headers: {
        Cookie: `token=${validToken}`,
      }
    }, { JWT_SECRET: TEST_SECRET })

    expect(res.status).toBe(200)
    const body = await res.json() as { success: boolean; data: AuthUser }
    expect(body.success).toBe(true)
    expect(body.data.id).toBe('user-1')
  })

  it('rejects expired token with 401', async () => {
    const expiredToken = await new SignJWT({ id: 'user-1', role: 'manager', name: 'X' })
      .setProtectedHeader({ alg: 'HS256' })
      .setExpirationTime('0s') // already expired
      .setIssuedAt(new Date(Date.now() - 7200000)) // 2 hours ago
      .sign(new TextEncoder().encode(TEST_SECRET))

    const app = createTestApp()
    const res = await app.request('/protected/test', {
      headers: { Authorization: `Bearer ${expiredToken}` }
    }, { JWT_SECRET: TEST_SECRET })

    expect(res.status).toBe(401)
  })
})
