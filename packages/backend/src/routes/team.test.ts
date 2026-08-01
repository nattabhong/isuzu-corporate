import { describe, it, expect, beforeAll, beforeEach } from 'vitest'
import { Hono } from 'hono'
import { SignJWT } from 'jose'
import Database from 'better-sqlite3'
import { drizzle } from 'drizzle-orm/better-sqlite3'
import { sql } from 'drizzle-orm'
import * as schema from '../db/schema'
import { teamRoutes } from './team'

const TEST_JWT_SECRET = 'test-jwt-secret-team-crud'

type TestEnv = {
  DB: D1Database
  JWT_SECRET: string
}

function createTestApp() {
  const app = new Hono<{ Bindings: TestEnv }>()
  app.route('/api/team', teamRoutes)
  return app
}

function createDb() {
  const sqlite = new Database(':memory:')
  sqlite.pragma('journal_mode = WAL')
  sqlite.pragma('foreign_keys = ON')
  const db = drizzle(sqlite, { schema })

  db.run(sql`
    CREATE TABLE IF NOT EXISTS team_members (
      id TEXT PRIMARY KEY,
      line_user_id TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      email TEXT UNIQUE,
      password_hash TEXT,
      phone TEXT,
      role TEXT NOT NULL DEFAULT 'sales_rep',
      territory TEXT,
      avatar_url TEXT,
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `)

  return db
}

function testEnv(db?: ReturnType<typeof createDb>): TestEnv {
  return {
    DB: (db as unknown as D1Database) ?? (undefined as unknown as D1Database),
    JWT_SECRET: TEST_JWT_SECRET,
  }
}

async function createToken(
  role: 'manager' | 'sales_rep',
  id = 'user-1',
  name = 'Test User',
): Promise<string> {
  return new SignJWT({ id, role, name })
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime('1h')
    .setIssuedAt()
    .sign(new TextEncoder().encode(TEST_JWT_SECRET))
}

function seedMember(
  db: ReturnType<typeof createDb>,
  overrides: Record<string, unknown> = {},
) {
  const member = {
    id: 'member-1',
    lineUserId: 'U-test-1',
    name: 'Test Member',
    role: 'sales_rep' as const,
    isActive: true,
    ...overrides,
  }
  db.insert(schema.teamMembers).values(member as typeof schema.teamMembers.$inferInsert).run()
  return member
}

describe('Team Routes', () => {
  describe('GET /api/team (list)', () => {
    it('returns 401 without auth', async () => {
      const app = createTestApp()
      const res = await app.request('/api/team', {}, testEnv())

      expect(res.status).toBe(401)
      const body = await res.json() as { success: boolean }
      expect(body.success).toBe(false)
    })

    it('manager sees all members', async () => {
      const db = createDb()
      seedMember(db, { id: 'member-1', name: 'Alice', lineUserId: 'U-alice', role: 'sales_rep' })
      seedMember(db, { id: 'member-2', name: 'Bob', lineUserId: 'U-bob', role: 'manager' })

      const token = await createToken('manager', 'member-2', 'Bob')
      const app = createTestApp()
      const res = await app.request('/api/team', {
        headers: { Authorization: `Bearer ${token}` },
      }, testEnv(db))

      expect(res.status).toBe(200)
      const body = await res.json() as { success: boolean; data: unknown[] }
      expect(body.success).toBe(true)
      expect(body.data).toHaveLength(2)
    })

    it('sales_rep sees only themselves', async () => {
      const db = createDb()
      seedMember(db, { id: 'member-1', name: 'Alice', lineUserId: 'U-alice', role: 'sales_rep' })
      seedMember(db, { id: 'member-2', name: 'Bob', lineUserId: 'U-bob', role: 'sales_rep' })

      const token = await createToken('sales_rep', 'member-1', 'Alice')
      const app = createTestApp()
      const res = await app.request('/api/team', {
        headers: { Authorization: `Bearer ${token}` },
      }, testEnv(db))

      expect(res.status).toBe(200)
      const body = await res.json() as { success: boolean; data: { id: string }[] }
      expect(body.success).toBe(true)
      expect(body.data).toHaveLength(1)
      expect(body.data[0].id).toBe('member-1')
    })

    it('sales_rep gets empty list if their record not found', async () => {
      const db = createDb()
      const token = await createToken('sales_rep', 'ghost-id', 'Ghost')
      const app = createTestApp()
      const res = await app.request('/api/team', {
        headers: { Authorization: `Bearer ${token}` },
      }, testEnv(db))

      expect(res.status).toBe(200)
      const body = await res.json() as { success: boolean; data: unknown[] }
      expect(body.success).toBe(true)
      expect(body.data).toHaveLength(0)
    })
  })

  describe('GET /api/team/:id (single)', () => {
    it('returns 401 without auth', async () => {
      const app = createTestApp()
      const res = await app.request('/api/team/member-1', {}, testEnv())

      expect(res.status).toBe(401)
    })

    it('returns 200 with member data', async () => {
      const db = createDb()
      seedMember(db, { id: 'member-1', name: 'Alice', lineUserId: 'U-alice' })

      const token = await createToken('manager', 'member-2', 'Boss')
      const app = createTestApp()
      const res = await app.request('/api/team/member-1', {
        headers: { Authorization: `Bearer ${token}` },
      }, testEnv(db))

      expect(res.status).toBe(200)
      const body = await res.json() as { success: boolean; data: { name: string; role: string } }
      expect(body.success).toBe(true)
      expect(body.data.name).toBe('Alice')
      expect(body.data.role).toBe('sales_rep')
    })

    it('returns 404 for non-existent member', async () => {
      const db = createDb()
      const token = await createToken('manager', 'member-2', 'Boss')
      const app = createTestApp()
      const res = await app.request('/api/team/non-existent', {
        headers: { Authorization: `Bearer ${token}` },
      }, testEnv(db))

      expect(res.status).toBe(404)
      const body = await res.json() as { success: boolean }
      expect(body.success).toBe(false)
    })

    it('sales_rep can view any member by id', async () => {
      const db = createDb()
      seedMember(db, { id: 'member-1', name: 'Alice', lineUserId: 'U-alice' })

      const token = await createToken('sales_rep', 'member-3', 'Rep')
      const app = createTestApp()
      const res = await app.request('/api/team/member-1', {
        headers: { Authorization: `Bearer ${token}` },
      }, testEnv(db))

      expect(res.status).toBe(200)
      const body = await res.json() as { success: boolean; data: { name: string } }
      expect(body.data.name).toBe('Alice')
    })
  })

  describe('POST /api/team (create — manager only)', () => {
    it('returns 401 without auth', async () => {
      const app = createTestApp()
      const res = await app.request('/api/team', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'New Member' }),
      }, testEnv())

      expect(res.status).toBe(401)
    })

    it('sales_rep gets 403', async () => {
      const token = await createToken('sales_rep', 'rep-1', 'Rep')
      const app = createTestApp()
      const res = await app.request('/api/team', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ name: 'New Member' }),
      }, testEnv())

      expect(res.status).toBe(403)
    })

    it('manager creates member successfully (201)', async () => {
      const db = createDb()
      const token = await createToken('manager', 'mgr-1', 'Boss')
      const app = createTestApp()
      const res = await app.request('/api/team', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: 'Charlie',
          email: 'charlie@example.com',
          role: 'sales_rep',
          territory: 'Bangkok',
        }),
      }, testEnv(db))

      expect(res.status).toBe(201)
      const body = await res.json() as { success: boolean; data: { id: string; name: string; email: string; role: string; territory: string } }
      expect(body.success).toBe(true)
      expect(body.data.name).toBe('Charlie')
      expect(body.data.email).toBe('charlie@example.com')
      expect(body.data.role).toBe('sales_rep')
      expect(body.data.territory).toBe('Bangkok')
      expect(body.data.id).toBeDefined()

      // Verify in DB
      const members = db.select().from(schema.teamMembers).all()
      expect(members).toHaveLength(1)
      expect(members[0].name).toBe('Charlie')
    })

    it('creates member with default role sales_rep', async () => {
      const db = createDb()
      const token = await createToken('manager', 'mgr-1', 'Boss')
      const app = createTestApp()
      const res = await app.request('/api/team', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ name: 'Dave' }),
      }, testEnv(db))

      expect(res.status).toBe(201)
      const body = await res.json() as { success: boolean; data: { role: string } }
      expect(body.data.role).toBe('sales_rep')
    })

    it('rejects with 400 on validation failure (empty name)', async () => {
      const token = await createToken('manager', 'mgr-1', 'Boss')
      const app = createTestApp()
      const res = await app.request('/api/team', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ name: '' }),
      }, testEnv())

      expect(res.status).toBe(400)
      const body = await res.json() as { success: boolean }
      expect(body.success).toBe(false)
    })

    it('rejects with 400 on invalid email', async () => {
      const token = await createToken('manager', 'mgr-1', 'Boss')
      const app = createTestApp()
      const res = await app.request('/api/team', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ name: 'Eve', email: 'not-an-email' }),
      }, testEnv())

      expect(res.status).toBe(400)
    })
  })

  describe('PATCH /api/team/:id (update — manager only)', () => {
    it('returns 401 without auth', async () => {
      const app = createTestApp()
      const res = await app.request('/api/team/member-1', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Updated' }),
      }, testEnv())

      expect(res.status).toBe(401)
    })

    it('sales_rep gets 403', async () => {
      const db = createDb()
      seedMember(db)
      const token = await createToken('sales_rep', 'rep-1', 'Rep')
      const app = createTestApp()
      const res = await app.request('/api/team/member-1', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ name: 'Updated' }),
      }, testEnv(db))

      expect(res.status).toBe(403)
    })

    it('manager updates member successfully', async () => {
      const db = createDb()
      seedMember(db, { id: 'member-1', name: 'Old Name', lineUserId: 'U-old' })
      const token = await createToken('manager', 'mgr-1', 'Boss')
      const app = createTestApp()
      const res = await app.request('/api/team/member-1', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ name: 'New Name', territory: 'Chiang Mai' }),
      }, testEnv(db))

      expect(res.status).toBe(200)
      const body = await res.json() as { success: boolean; data: { name: string; territory: string } }
      expect(body.success).toBe(true)
      expect(body.data.name).toBe('New Name')
      expect(body.data.territory).toBe('Chiang Mai')

      // Verify in DB
      const members = db.select().from(schema.teamMembers).all()
      expect(members[0].name).toBe('New Name')
    })

    it('returns updated member data for non-existent id', async () => {
      const db = createDb()
      const token = await createToken('manager', 'mgr-1', 'Boss')
      const app = createTestApp()
      const res = await app.request('/api/team/non-existent', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ name: 'Nobody' }),
      }, testEnv(db))

      // Update should still return 200 but data will be null
      expect(res.status).toBe(200)
      const body = await res.json() as { success: boolean; data: unknown }
      expect(body.success).toBe(true)
      expect(body.data).toBeNull()
    })
  })

  describe('DELETE /api/team/:id (deactivate — manager only)', () => {
    it('returns 401 without auth', async () => {
      const app = createTestApp()
      const res = await app.request('/api/team/member-1', {
        method: 'DELETE',
      }, testEnv())

      expect(res.status).toBe(401)
    })

    it('sales_rep gets 403', async () => {
      const db = createDb()
      seedMember(db)
      const token = await createToken('sales_rep', 'rep-1', 'Rep')
      const app = createTestApp()
      const res = await app.request('/api/team/member-1', {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }, testEnv(db))

      expect(res.status).toBe(403)
    })

    it('manager deactivates member (soft delete)', async () => {
      const db = createDb()
      seedMember(db, { id: 'member-1', name: 'To Deactivate', lineUserId: 'U-kill', isActive: true })
      const token = await createToken('manager', 'mgr-1', 'Boss')
      const app = createTestApp()
      const res = await app.request('/api/team/member-1', {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }, testEnv(db))

      expect(res.status).toBe(200)
      const body = await res.json() as { success: boolean }
      expect(body.success).toBe(true)

      // Verify member is deactivated in DB
      const members = db.select().from(schema.teamMembers).all()
      expect(members).toHaveLength(1)
      expect(members[0].isActive).toBe(false)
    })

    it('deactivating already inactive member is idempotent', async () => {
      const db = createDb()
      seedMember(db, { id: 'member-1', name: 'Already Dead', lineUserId: 'U-dead', isActive: false })
      const token = await createToken('manager', 'mgr-1', 'Boss')
      const app = createTestApp()
      const res = await app.request('/api/team/member-1', {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }, testEnv(db))

      expect(res.status).toBe(200)
      const body = await res.json() as { success: boolean }
      expect(body.success).toBe(true)

      const members = db.select().from(schema.teamMembers).all()
      expect(members[0].isActive).toBe(false)
    })
  })

  describe('Authorization — cookie-based', () => {
    it('reads token from cookie', async () => {
      const db = createDb()
      const token = await createToken('manager', 'mgr-1', 'CookieBoss')
      const app = createTestApp()
      const res = await app.request('/api/team', {
        headers: { Cookie: `token=${token}` },
      }, testEnv(db))

      expect(res.status).toBe(200)
      const body = await res.json() as { success: boolean }
      expect(body.success).toBe(true)
    })
  })
})
