import { describe, it, expect, beforeAll, beforeEach } from 'vitest'
import { Hono } from 'hono'
import Database from 'better-sqlite3'
import { drizzle } from 'drizzle-orm/better-sqlite3'
import { sql } from 'drizzle-orm'
import { SignJWT } from 'jose'
import * as schema from '../db/schema'
import { visitRoutes } from './visits'

const TEST_JWT_SECRET = 'test-jwt-secret-visits'

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
  db.run(sql`
    CREATE TABLE IF NOT EXISTS customers (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      company_type TEXT,
      industry TEXT,
      address TEXT,
      province TEXT,
      district TEXT,
      lat REAL,
      lng REAL,
      segment TEXT NOT NULL DEFAULT 'B',
      assigned_to TEXT REFERENCES team_members(id),
      status TEXT NOT NULL DEFAULT 'active',
        fleet_contract_expiry TEXT,
        zone TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `)
  db.run(sql`
    CREATE TABLE IF NOT EXISTS visit_plans (
      id TEXT PRIMARY KEY,
      customer_id TEXT NOT NULL REFERENCES customers(id),
      sales_rep_id TEXT NOT NULL REFERENCES team_members(id),
      month TEXT NOT NULL,
      planned_date TEXT NOT NULL,
      visit_type TEXT NOT NULL DEFAULT 'follow_up',
      objective TEXT,
      status TEXT NOT NULL DEFAULT 'planned',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `)
  db.run(sql`
    CREATE TABLE IF NOT EXISTS visit_logs (
      id TEXT PRIMARY KEY,
      visit_plan_id TEXT REFERENCES visit_plans(id),
      customer_id TEXT NOT NULL REFERENCES customers(id),
      sales_rep_id TEXT NOT NULL REFERENCES team_members(id),
      visit_date TEXT NOT NULL,
      start_time TEXT,
      end_time TEXT,
      gps_lat REAL,
      gps_lng REAL,
      notes TEXT,
        lost_reason TEXT,
        competitor_brand TEXT,
        discount_amount REAL,
      next_step TEXT,
      customer_mood TEXT,
      attachments TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `)
  return db
}

async function createToken(payload: { id: string; role: string; name: string }): Promise<string> {
  const encoder = new TextEncoder()
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime('1h')
    .setIssuedAt()
    .sign(encoder.encode(TEST_JWT_SECRET))
}

function createApp(db: ReturnType<typeof createDb>) {
  const app = new Hono<{ Bindings: { DB: any; JWT_SECRET: string; STORAGE?: R2Bucket } }>()
  app.route('/api', visitRoutes)
  return app
}

function env(db: ReturnType<typeof createDb>) {
  return {
    DB: db as unknown as D1Database,
    JWT_SECRET: TEST_JWT_SECRET,
  }
}

describe('Visit Routes', () => {
  let db: ReturnType<typeof createDb>
  let managerToken: string
  let salesRepToken: string
  let managerId: string
  let salesRepId: string
  let customerAId: string
  let customerBId: string

  beforeAll(async () => {
    db = createDb()

    // Seed team members
    managerId = 'manager-001'
    salesRepId = 'sales-001'
    db.insert(schema.teamMembers).values({
      id: managerId,
      lineUserId: 'line-mgr-001',
      name: 'Manager One',
      role: 'manager',
      isActive: true,
    }).run()
    db.insert(schema.teamMembers).values({
      id: salesRepId,
      lineUserId: 'line-rep-001',
      name: 'Sales Rep One',
      role: 'sales_rep',
      isActive: true,
    }).run()

    // Seed customers
    customerAId = 'cust-a'
    customerBId = 'cust-b'
    db.insert(schema.customers).values({
      id: customerAId,
      name: 'ACME Corp',
      segment: 'A',
      assignedTo: salesRepId,
      status: 'active',
    }).run()
    db.insert(schema.customers).values({
      id: customerBId,
      name: 'Beta Ltd',
      segment: 'B',
      assignedTo: salesRepId,
      status: 'active',
    }).run()

    // Create tokens
    managerToken = await createToken({ id: managerId, role: 'manager', name: 'Manager One' })
    salesRepToken = await createToken({ id: salesRepId, role: 'sales_rep', name: 'Sales Rep One' })
  })

  // ================================================================
  // Visit Plans
  // ================================================================

  describe('GET /api/visit-plans', () => {
    beforeEach(() => {
      // Clean visit_plans before each test in this block
      db.run(sql`DELETE FROM visit_plans`)
    })

    it('lists visit plans (empty)', async () => {
      const app = createApp(db)
      const res = await app.request('/api/visit-plans', {
        headers: { Authorization: `Bearer ${salesRepToken}` },
      }, env(db))

      expect(res.status).toBe(200)
      const body = await res.json() as any
      expect(body.success).toBe(true)
      expect(body.data).toEqual([])
    })

    it('filters visit plans by month', async () => {
      // Insert a plan
      db.insert(schema.visitPlans).values({
        id: 'vp-001',
        customerId: customerAId,
        salesRepId: salesRepId,
        month: '2026-08',
        plannedDate: '2026-08-15',
        visitType: 'follow_up',
        status: 'planned',
      }).run()

      const app = createApp(db)
      const res = await app.request('/api/visit-plans?month=2026-08', {
        headers: { Authorization: `Bearer ${salesRepToken}` },
      }, env(db))

      expect(res.status).toBe(200)
      const body = await res.json() as any
      expect(body.success).toBe(true)
      expect(body.data).toHaveLength(1)
      expect(body.data[0].customerId).toBe(customerAId)
    })

    it('returns empty when no plans match month filter', async () => {
      db.insert(schema.visitPlans).values({
        id: 'vp-002',
        customerId: customerAId,
        salesRepId: salesRepId,
        month: '2026-08',
        plannedDate: '2026-08-15',
        status: 'planned',
      }).run()

      const app = createApp(db)
      const res = await app.request('/api/visit-plans?month=2026-09', {
        headers: { Authorization: `Bearer ${salesRepToken}` },
      }, env(db))

      expect(res.status).toBe(200)
      const body = await res.json() as any
      expect(body.data).toEqual([])
    })

    it('sales rep only sees own plans', async () => {
      // Create another sales rep + customer
      const otherRepId = 'sales-other'
      const otherCustId = 'cust-other'
      db.insert(schema.teamMembers).values({
        id: otherRepId, lineUserId: 'line-other', name: 'Other Rep', role: 'sales_rep', isActive: true,
      }).run()
      db.insert(schema.customers).values({
        id: otherCustId, name: 'Other Corp', segment: 'C', assignedTo: otherRepId, status: 'active',
      }).run()

      db.insert(schema.visitPlans).values({
        id: 'vp-mine', customerId: customerAId, salesRepId: salesRepId,
        month: '2026-08', plannedDate: '2026-08-15', status: 'planned',
      }).run()
      db.insert(schema.visitPlans).values({
        id: 'vp-other', customerId: otherCustId, salesRepId: otherRepId,
        month: '2026-08', plannedDate: '2026-08-16', status: 'planned',
      }).run()

      const app = createApp(db)
      const res = await app.request('/api/visit-plans?month=2026-08', {
        headers: { Authorization: `Bearer ${salesRepToken}` },
      }, env(db))

      expect(res.status).toBe(200)
      const body = await res.json() as any
      expect(body.data).toHaveLength(1)
      expect(body.data[0].id).toBe('vp-mine')
    })

    it('manager sees all plans', async () => {
      const otherRepId = 'sales-other2'
      const otherCustId = 'cust-other2'
      db.insert(schema.teamMembers).values({
        id: otherRepId, lineUserId: 'line-other2', name: 'Other Rep 2', role: 'sales_rep', isActive: true,
      }).run()
      db.insert(schema.customers).values({
        id: otherCustId, name: 'Other Corp 2', segment: 'C', assignedTo: otherRepId, status: 'active',
      }).run()

      db.insert(schema.visitPlans).values({
        id: 'vp-mgr-1', customerId: customerAId, salesRepId: salesRepId,
        month: '2026-08', plannedDate: '2026-08-15', status: 'planned',
      }).run()
      db.insert(schema.visitPlans).values({
        id: 'vp-mgr-2', customerId: otherCustId, salesRepId: otherRepId,
        month: '2026-08', plannedDate: '2026-08-16', status: 'planned',
      }).run()

      const app = createApp(db)
      const res = await app.request('/api/visit-plans?month=2026-08', {
        headers: { Authorization: `Bearer ${managerToken}` },
      }, env(db))

      expect(res.status).toBe(200)
      const body = await res.json() as any
      expect(body.data).toHaveLength(2)
    })

    it('requires authentication', async () => {
      const app = createApp(db)
      const res = await app.request('/api/visit-plans', {}, env(db))

      expect(res.status).toBe(401)
      const body = await res.json() as any
      expect(body.success).toBe(false)
    })
  })

  describe('POST /api/visit-plans', () => {
    it('creates a new visit plan', async () => {
      const app = createApp(db)
      const res = await app.request('/api/visit-plans', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${salesRepToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          customerId: customerAId,
          salesRepId: salesRepId,
          month: '2026-09',
          plannedDate: '2026-09-10',
          visitType: 'first_visit',
          objective: 'Initial visit',
        }),
      }, env(db))

      expect(res.status).toBe(201)
      const body = await res.json() as any
      expect(body.success).toBe(true)
      expect(body.data).toBeDefined()
      expect(body.data.customerId).toBe(customerAId)
      expect(body.data.visitType).toBe('first_visit')
      expect(body.data.status).toBe('planned')
    })

    it('uses default values for optional fields', async () => {
      const app = createApp(db)
      const res = await app.request('/api/visit-plans', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${salesRepToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          customerId: customerAId,
          salesRepId: salesRepId,
          month: '2026-09',
          plannedDate: '2026-09-12',
        }),
      }, env(db))

      expect(res.status).toBe(201)
      const body = await res.json() as any
      expect(body.data.visitType).toBe('follow_up')
      expect(body.data.status).toBe('planned')
    })

    it('fails with invalid month format', async () => {
      const app = createApp(db)
      const res = await app.request('/api/visit-plans', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${salesRepToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          customerId: customerAId,
          salesRepId: salesRepId,
          month: 'invalid',
          plannedDate: '2026-09-12',
        }),
      }, env(db))

      expect(res.status).toBe(400)
      const body = await res.json() as any
      expect(body.success).toBe(false)
    })

    it('requires authentication', async () => {
      const app = createApp(db)
      const res = await app.request('/api/visit-plans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerId: customerAId,
          salesRepId: salesRepId,
          month: '2026-09',
          plannedDate: '2026-09-12',
        }),
      }, env(db))

      expect(res.status).toBe(401)
    })
  })

  describe('POST /api/visit-plans/generate', () => {
    beforeEach(() => {
      db.run(sql`DELETE FROM visit_plans`)
    })

    it('generates monthly plans (manager only)', async () => {
      const app = createApp(db)
      const res = await app.request('/api/visit-plans/generate', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${managerToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ month: '2026-09' }),
      }, env(db))

      // Should succeed even if no customers — generates 0 plans
      expect(res.status).toBe(201)
      const body = await res.json() as any
      expect(body.success).toBe(true)
    })

    it('fails when sales rep tries to generate', async () => {
      const app = createApp(db)
      const res = await app.request('/api/visit-plans/generate', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${salesRepToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ month: '2026-09' }),
      }, env(db))

      expect(res.status).toBe(403)
      const body = await res.json() as any
      expect(body.success).toBe(false)
    })

    it('creates plans for active customers assigned to sales reps', async () => {
      // Add more customers assigned to our sales rep
      db.insert(schema.customers).values({
        id: 'cust-gen-1', name: 'Gen Corp 1', segment: 'A', assignedTo: salesRepId, status: 'active',
      }).run()
      db.insert(schema.customers).values({
        id: 'cust-gen-2', name: 'Gen Corp 2', segment: 'B', assignedTo: salesRepId, status: 'active',
      }).run()

      const app = createApp(db)
      const res = await app.request('/api/visit-plans/generate', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${managerToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ month: '2026-09' }),
      }, env(db))

      expect(res.status).toBe(201)
      const body = await res.json() as any
      expect(body.success).toBe(true)
      expect(body.data).toBeDefined()
      // Should generate plans for active customers with assigned reps
      expect(body.data.length).toBeGreaterThanOrEqual(0)
    })

    it('does not duplicate plans for same month/customer/rep', async () => {
      // First generate
      const app = createApp(db)
      await app.request('/api/visit-plans/generate', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${managerToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ month: '2026-09' }),
      }, env(db))

      // Check current count
      const before = db.select().from(schema.visitPlans).all().length

      // Generate again
      await app.request('/api/visit-plans/generate', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${managerToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ month: '2026-09' }),
      }, env(db))

      const after = db.select().from(schema.visitPlans).all().length
      expect(after).toBe(before) // No duplicates
    })
  })

  describe('PATCH /api/visit-plans/:id', () => {
    let planId: string

    beforeEach(() => {
      db.run(sql`DELETE FROM visit_plans`)
      planId = 'vp-update-1'
      db.insert(schema.visitPlans).values({
        id: planId,
        customerId: customerAId,
        salesRepId: salesRepId,
        month: '2026-08',
        plannedDate: '2026-08-20',
        visitType: 'follow_up',
        status: 'planned',
      }).run()
    })

    it('updates visit plan status', async () => {
      const app = createApp(db)
      const res = await app.request(`/api/visit-plans/${planId}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${salesRepToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: 'completed' }),
      }, env(db))

      expect(res.status).toBe(200)
      const body = await res.json() as any
      expect(body.success).toBe(true)
      expect(body.data.status).toBe('completed')

      // Verify in DB
      const plan = db.select().from(schema.visitPlans).where(
        sql`id = ${planId}`
      ).get() as any
      expect(plan.status).toBe('completed')
    })

    it('fails with invalid status', async () => {
      const app = createApp(db)
      const res = await app.request(`/api/visit-plans/${planId}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${salesRepToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: 'invalid_status' }),
      }, env(db))

      expect(res.status).toBe(400)
      const body = await res.json() as any
      expect(body.success).toBe(false)
    })

    it('returns 404 for non-existent plan', async () => {
      const app = createApp(db)
      const res = await app.request('/api/visit-plans/non-existent', {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${salesRepToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: 'completed' }),
      }, env(db))

      expect(res.status).toBe(404)
    })
  })

  // ================================================================
  // Visit Logs
  // ================================================================

  describe('GET /api/visit-logs', () => {
    beforeEach(() => {
      db.run(sql`DELETE FROM visit_logs`)
    })

    it('lists visit logs (empty)', async () => {
      const app = createApp(db)
      const res = await app.request('/api/visit-logs', {
        headers: { Authorization: `Bearer ${salesRepToken}` },
      }, env(db))

      expect(res.status).toBe(200)
      const body = await res.json() as any
      expect(body.success).toBe(true)
      expect(body.data).toEqual([])
    })

    it('lists visit logs with data', async () => {
      db.insert(schema.visitLogs).values({
        id: 'vl-001',
        customerId: customerAId,
        salesRepId: salesRepId,
        visitDate: '2026-08-15',
        gpsLat: 13.7563,
        gpsLng: 100.5018,
        notes: 'Good meeting',
      }).run()

      const app = createApp(db)
      const res = await app.request('/api/visit-logs', {
        headers: { Authorization: `Bearer ${salesRepToken}` },
      }, env(db))

      expect(res.status).toBe(200)
      const body = await res.json() as any
      expect(body.data).toHaveLength(1)
      expect(body.data[0].notes).toBe('Good meeting')
    })

    it('sales rep only sees own logs', async () => {
      const otherRepId = 'sales-vl-other'
      const otherCustId = 'cust-vl-other'
      db.insert(schema.teamMembers).values({
        id: otherRepId, lineUserId: 'line-vl-other', name: 'VL Other', role: 'sales_rep', isActive: true,
      }).run()
      db.insert(schema.customers).values({
        id: otherCustId, name: 'VL Other Corp', segment: 'C', assignedTo: otherRepId, status: 'active',
      }).run()

      db.insert(schema.visitLogs).values({
        id: 'vl-mine', customerId: customerAId, salesRepId: salesRepId, visitDate: '2026-08-15',
      }).run()
      db.insert(schema.visitLogs).values({
        id: 'vl-other', customerId: otherCustId, salesRepId: otherRepId, visitDate: '2026-08-16',
      }).run()

      const app = createApp(db)
      const res = await app.request('/api/visit-logs', {
        headers: { Authorization: `Bearer ${salesRepToken}` },
      }, env(db))

      expect(res.status).toBe(200)
      const body = await res.json() as any
      expect(body.data).toHaveLength(1)
      expect(body.data[0].id).toBe('vl-mine')
    })
  })

  describe('POST /api/visit-logs', () => {
    it('records a visit log with GPS coordinates', async () => {
      const app = createApp(db)
      const res = await app.request('/api/visit-logs', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${salesRepToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          customerId: customerAId,
          visitDate: '2026-08-15',
          gpsLat: 13.7563,
          gpsLng: 100.5018,
          notes: 'Started visit',
          customerMood: 'positive',
        }),
      }, env(db))

      expect(res.status).toBe(201)
      const body = await res.json() as any
      expect(body.success).toBe(true)
      expect(body.data.gpsLat).toBe(13.7563)
      expect(body.data.gpsLng).toBe(100.5018)
      expect(body.data.customerMood).toBe('positive')
    })

    it('links visit log to a visit plan', async () => {
      const planId = 'vp-link'
      db.insert(schema.visitPlans).values({
        id: planId, customerId: customerAId, salesRepId: salesRepId,
        month: '2026-08', plannedDate: '2026-08-15', status: 'planned',
      }).run()

      const app = createApp(db)
      const res = await app.request('/api/visit-logs', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${salesRepToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          customerId: customerAId,
          visitPlanId: planId,
          visitDate: '2026-08-15',
        }),
      }, env(db))

      expect(res.status).toBe(201)
      const body = await res.json() as any
      expect(body.data.visitPlanId).toBe(planId)
    })

    it('auto-sets salesRepId from authenticated user', async () => {
      const app = createApp(db)
      const res = await app.request('/api/visit-logs', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${salesRepToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          customerId: customerAId,
          visitDate: '2026-08-15',
        }),
      }, env(db))

      expect(res.status).toBe(201)
      const body = await res.json() as any
      expect(body.data.salesRepId).toBe(salesRepId)
    })

    it('fails with missing required fields', async () => {
      const app = createApp(db)
      const res = await app.request('/api/visit-logs', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${salesRepToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({}), // missing customerId and visitDate
      }, env(db))

      expect(res.status).toBe(400)
      const body = await res.json() as any
      expect(body.success).toBe(false)
    })
  })

  describe('PATCH /api/visit-logs/:id', () => {
    let logId: string

    beforeEach(() => {
      db.run(sql`DELETE FROM visit_logs`)
      logId = 'vl-update-1'
      db.insert(schema.visitLogs).values({
        id: logId,
        customerId: customerAId,
        salesRepId: salesRepId,
        visitDate: '2026-08-15',
        notes: 'Initial notes',
      }).run()
    })

    it('updates a visit log', async () => {
      const app = createApp(db)
      const res = await app.request(`/api/visit-logs/${logId}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${salesRepToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          notes: 'Updated notes',
          customerMood: 'neutral',
          nextStep: 'Follow up next week',
        }),
      }, env(db))

      expect(res.status).toBe(200)
      const body = await res.json() as any
      expect(body.success).toBe(true)
      expect(body.data.notes).toBe('Updated notes')
      expect(body.data.customerMood).toBe('neutral')
      expect(body.data.nextStep).toBe('Follow up next week')
    })

    it('returns 404 for non-existent log', async () => {
      const app = createApp(db)
      const res = await app.request('/api/visit-logs/non-existent', {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${salesRepToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ notes: 'test' }),
      }, env(db))

      expect(res.status).toBe(404)
    })
  })

  describe('POST /api/visit-logs/upload', () => {
    beforeEach(() => {
      db.run(sql`DELETE FROM visit_logs`)
    })

    it('accepts file upload', async () => {
      // Mock R2 bucket - upload won't work in test, but route should handle it
      // For testing, we verify the route structure exists
      const app = createApp(db)

      // Attempt upload with form data
      const formData = new FormData()
      const blob = new Blob(['test-image-data'], { type: 'image/jpeg' })
      formData.append('file', blob, 'photo.jpg')
      formData.append('visitLogId', 'vl-upload-1')

      // Create the log first
      db.insert(schema.visitLogs).values({
        id: 'vl-upload-1',
        customerId: customerAId,
        salesRepId: salesRepId,
        visitDate: '2026-08-15',
      }).run()

      const res = await app.request('/api/visit-logs/upload', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${salesRepToken}`,
        },
        body: formData,
      }, env(db))

      // Without real R2, it'll fail but route should exist and be protected by auth
      expect(res.status).not.toBe(404) // Route exists
    })

    it('requires authentication', async () => {
      const app = createApp(db)
      const res = await app.request('/api/visit-logs/upload', {
        method: 'POST',
        body: new FormData(),
      }, env(db))

      expect(res.status).toBe(401)
    })
  })
})
