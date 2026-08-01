import { describe, it, expect, beforeAll, beforeEach, vi } from 'vitest'
import { Hono } from 'hono'
import { setCookie } from 'hono/cookie'
import Database from 'better-sqlite3'
import { drizzle } from 'drizzle-orm/better-sqlite3'
import { sql } from 'drizzle-orm'
import * as schema from '../db/schema'
import { authRoutes } from './auth'

// Mock global fetch for LINE API calls
const mockFetch = vi.fn()
vi.stubGlobal('fetch', mockFetch)

const TEST_CHANNEL_ID = 'test-channel-id'
const TEST_CHANNEL_SECRET = 'test-channel-secret'
const TEST_JWT_SECRET = 'test-jwt-secret'

type TestEnv = {
  DB: D1Database
  JWT_SECRET: string
  LINE_CHANNEL_ID: string
  LINE_CHANNEL_SECRET: string
}

function createApp() {
  const app = new Hono<{ Bindings: TestEnv }>()
  app.route('/api/auth', authRoutes)
  return app
}

function createDb() {
  const sqlite = new Database(':memory:')
  sqlite.pragma('journal_mode = WAL')
  sqlite.pragma('foreign_keys = ON')
  const db = drizzle(sqlite, { schema })

  // Create tables
  db.run(sql`
    CREATE TABLE IF NOT EXISTS team_members (
      id TEXT PRIMARY KEY,
      line_user_id TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      email TEXT,
      phone TEXT,
      role TEXT NOT NULL DEFAULT 'sales_rep',
      territory TEXT,
      avatar_url TEXT,
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `)
  db.run(sql`
    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      team_member_id TEXT NOT NULL REFERENCES team_members(id),
      token TEXT NOT NULL,
      expires_at TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `)
  return db
}

function env(): TestEnv {
  return {
    DB: undefined as unknown as D1Database,
    JWT_SECRET: TEST_JWT_SECRET,
    LINE_CHANNEL_ID: TEST_CHANNEL_ID,
    LINE_CHANNEL_SECRET: TEST_CHANNEL_SECRET,
  }
}

describe('Auth Routes', () => {
  describe('GET /api/auth/line', () => {
    it('returns 302 redirect to LINE authorization URL', async () => {
      const app = createApp()
      const res = await app.request('/api/auth/line', {}, env())

      expect(res.status).toBe(302)
      const location = res.headers.get('Location')
      expect(location).toContain('https://access.line.me/oauth2/v2.1/authorize')
      expect(location).toContain('response_type=code')
      expect(location).toContain(`client_id=${TEST_CHANNEL_ID}`)
      expect(location).toContain('redirect_uri=')
      expect(location).toContain('state=')
      expect(location).toContain('scope=profile')
    })

    it('sets a CSRF state cookie', async () => {
      const app = createApp()
      const res = await app.request('/api/auth/line', {}, env())

      const cookies = res.headers.getSetCookie?.() ?? res.headers.get('Set-Cookie')
      expect(cookies).toBeDefined()
      const cookieStr = Array.isArray(cookies) ? cookies.join('; ') : cookies
      expect(cookieStr).toContain('line_state=')
      expect(cookieStr).toContain('HttpOnly')
      expect(cookieStr).toContain('SameSite=Lax')
      expect(cookieStr).toContain('Path=/')
    })

    it('sets a state cookie that is a valid UUID', async () => {
      const app = createApp()
      const res = await app.request('/api/auth/line', {}, env())

      const cookies = res.headers.getSetCookie?.() ?? res.headers.get('Set-Cookie')
      const cookieStr = Array.isArray(cookies) ? cookies.join('; ') : cookies
      const match = cookieStr.match(/line_state=([a-f0-9-]+)/)
      expect(match).toBeTruthy()
      expect(match![1]).toMatch(/^[a-f0-9-]{36}$/)
    })
  })

  describe('GET /api/auth/line/callback', () => {
    beforeEach(() => {
      mockFetch.mockReset()
    })

    it('fails with 400 when no code parameter is provided', async () => {
      const app = createApp()
      const res = await app.request('/api/auth/line/callback', {}, env())

      expect(res.status).toBe(400)
      const body = await res.json() as { success: boolean; error: string }
      expect(body.success).toBe(false)
      expect(body.error).toBeDefined()
    })

    it('fails with 400 when code is provided but state cookie is missing (CSRF)', async () => {
      const app = createApp()
      const res = await app.request(
        '/api/auth/line/callback?code=test-code',
        {},
        env(),
      )

      expect(res.status).toBe(400)
      const body = await res.json() as { success: boolean; error: string }
      expect(body.success).toBe(false)
    })

    it('fails with 403 when state parameter does not match CSRF cookie', async () => {
      const app = createApp()
      const res = await app.request(
        '/api/auth/line/callback?code=test-code&state=mismatched-state',
        {
          headers: {
            Cookie: 'line_state=expected-state',
          },
        },
        env(),
      )

      expect(res.status).toBe(403)
      const body = await res.json() as { success: boolean; error: string }
      expect(body.success).toBe(false)
    })

    it('auto-registers new LINE users as sales_rep and returns JWT', async () => {
      // Mock LINE token exchange
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          access_token: 'line-access-token-123',
          id_token: 'line-id-token-456',
        }),
      })
      // Mock LINE profile
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          userId: 'U123456789',
          displayName: 'Test User',
          pictureUrl: 'https://example.com/avatar.jpg',
        }),
      })

      const db = createDb()
      const testEnv = { ...env(), DB: db as unknown as D1Database }

      const app = createApp()
      const res = await app.request(
        '/api/auth/line/callback?code=valid-auth-code&state=csrf-state-123',
        {
          headers: {
            Cookie: 'line_state=csrf-state-123',
          },
        },
        testEnv,
      )

      expect(res.status).toBe(302)
      const location = res.headers.get('Location')
      expect(location).toBe('/')

      // Check that a session cookie was set
      const cookies = res.headers.getSetCookie?.() ?? res.headers.get('Set-Cookie')
      expect(cookies).toBeDefined()
      const cookieStr = Array.isArray(cookies) ? cookies.join('; ') : cookies
      expect(cookieStr).toContain('token=')

      // Check that line_state cookie was cleared
      expect(cookieStr).toContain('line_state=;')

      // Verify user was inserted into team_members
      const members = db.select().from(schema.teamMembers).all()
      expect(members).toHaveLength(1)
      expect(members[0].lineUserId).toBe('U123456789')
      expect(members[0].name).toBe('Test User')
      expect(members[0].role).toBe('sales_rep')
      expect(members[0].isActive).toBe(true)
      expect(members[0].avatarUrl).toBe('https://example.com/avatar.jpg')

      // Verify session was created
      const sessions = db.select().from(schema.sessions).all()
      expect(sessions).toHaveLength(1)
      expect(sessions[0].teamMemberId).toBe(members[0].id)
    })

    it('logs in existing LINE user without duplicating team_member', async () => {
      const db = createDb()
      // Pre-insert a team member
      db.insert(schema.teamMembers).values({
        id: 'existing-member-1',
        lineUserId: 'U-EXISTING',
        name: 'Existing User',
        role: 'sales_rep',
      }).run()

      // Mock LINE token exchange
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          access_token: 'line-access-token-existing',
        }),
      })
      // Mock LINE profile (returns same userId)
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          userId: 'U-EXISTING',
          displayName: 'Existing User Updated',
          pictureUrl: null,
        }),
      })

      const testEnv = { ...env(), DB: db as unknown as D1Database }

      const app = createApp()
      const res = await app.request(
        '/api/auth/line/callback?code=valid-code&state=csrf-abc',
        {
          headers: {
            Cookie: 'line_state=csrf-abc',
          },
        },
        testEnv,
      )

      expect(res.status).toBe(302)

      // Should still have only 1 team member (no duplicate)
      const members = db.select().from(schema.teamMembers).all()
      expect(members).toHaveLength(1)
      expect(members[0].lineUserId).toBe('U-EXISTING')
    })

    it('returns error when LINE token exchange fails', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => ({ error: 'invalid_grant' }),
      })

      const app = createApp()
      const res = await app.request(
        '/api/auth/line/callback?code=bad-code&state=csrf-state',
        {
          headers: {
            Cookie: 'line_state=csrf-state',
          },
        },
        env(),
      )

      expect(res.status).toBe(401)
      const body = await res.json() as { success: boolean; error: string }
      expect(body.success).toBe(false)
    })

    it('returns error when LINE profile fetch fails', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          access_token: 'line-access-token-bad-profile',
        }),
      })
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
      })

      const app = createApp()
      const res = await app.request(
        '/api/auth/line/callback?code=valid-code&state=csrf-state',
        {
          headers: {
            Cookie: 'line_state=csrf-state',
          },
        },
        env(),
      )

      expect(res.status).toBe(401)
      const body = await res.json() as { success: boolean; error: string }
      expect(body.success).toBe(false)
    })
  })

  describe('GET /api/auth/me', () => {
    it('returns 401 when no token is provided', async () => {
      const app = createApp()
      const res = await app.request('/api/auth/me', {}, env())

      expect(res.status).toBe(401)
      const body = await res.json() as { success: boolean; error: string }
      expect(body.success).toBe(false)
    })

    it('returns 401 with invalid token', async () => {
      const app = createApp()
      const res = await app.request(
        '/api/auth/me',
        {
          headers: {
            Cookie: 'token=invalid-jwt-token-here',
          },
        },
        env(),
      )

      expect(res.status).toBe(401)
      const body = await res.json() as { success: boolean; error: string }
      expect(body.success).toBe(false)
    })

    it('returns user info with valid JWT token', async () => {
      // First, do a full login flow to get a real token
      const db = createDb()

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ access_token: 'at-me' }),
      })
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          userId: 'U-ME-TEST',
          displayName: 'Me Test User',
          pictureUrl: null,
        }),
      })

      const testEnv = { ...env(), DB: db as unknown as D1Database }
      const app = createApp()

      const loginRes = await app.request(
        '/api/auth/line/callback?code=valid-code&state=csrf-me',
        {
          headers: { Cookie: 'line_state=csrf-me' },
        },
        testEnv,
      )

      // Extract token from Set-Cookie
      const setCookie = loginRes.headers.getSetCookie?.() ?? loginRes.headers.get('Set-Cookie')
      const cookieStr = Array.isArray(setCookie) ? setCookie.join('; ') : (setCookie ?? '')
      const tokenMatch = cookieStr.match(/token=([^;]+)/)
      expect(tokenMatch).toBeTruthy()
      const token = tokenMatch![1]

      // Now call /me with the token
      const meRes = await app.request(
        '/api/auth/me',
        {
          headers: {
            Cookie: `token=${token}`,
          },
        },
        env(),
      )

      expect(meRes.status).toBe(200)
      const body = await meRes.json() as { success: boolean; data: { id: string; role: string; name: string } }
      expect(body.success).toBe(true)
      expect(body.data).toMatchObject({
        role: 'sales_rep',
        name: 'Me Test User',
      })
      expect(body.data.id).toBeDefined()
    })
  })

  describe('POST /api/auth/logout', () => {
    it('clears the token cookie', async () => {
      const app = createApp()
      const res = await app.request('/api/auth/logout', { method: 'POST' }, env())

      expect(res.status).toBe(200)
      const cookies = res.headers.getSetCookie?.() ?? res.headers.get('Set-Cookie')
      expect(cookies).toBeDefined()
      const cookieStr = Array.isArray(cookies) ? cookies.join('; ') : cookies
      expect(cookieStr).toContain('token=;')
      expect(cookieStr).toContain('Max-Age=0')
    })

    it('returns success even without token', async () => {
      const app = createApp()
      const res = await app.request('/api/auth/logout', { method: 'POST' }, env())

      expect(res.status).toBe(200)
      const body = await res.json() as { success: boolean }
      expect(body.success).toBe(true)
    })
  })
})
