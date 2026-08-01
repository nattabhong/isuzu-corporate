import { describe, it, expect, beforeAll, beforeEach } from 'vitest'
import { Hono } from 'hono'
import Database from 'better-sqlite3'
import { drizzle } from 'drizzle-orm/better-sqlite3'
import { sql } from 'drizzle-orm'
import { SignJWT } from 'jose'
import * as schema from '../db/schema'
import { reportsRoutes } from './reports'

const TEST_JWT_SECRET = 'test-jwt-secret-reports'

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
      next_step TEXT,
      customer_mood TEXT,
      attachments TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `)
  db.run(sql`
    CREATE TABLE IF NOT EXISTS call_plans (
      id TEXT PRIMARY KEY,
      customer_id TEXT NOT NULL REFERENCES customers(id),
      sales_rep_id TEXT NOT NULL REFERENCES team_members(id),
      month TEXT NOT NULL,
      planned_date TEXT NOT NULL,
      call_purpose TEXT NOT NULL DEFAULT 'check_in',
      status TEXT NOT NULL DEFAULT 'planned',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `)
  db.run(sql`
    CREATE TABLE IF NOT EXISTS call_logs (
      id TEXT PRIMARY KEY,
      call_plan_id TEXT REFERENCES call_plans(id),
      customer_id TEXT NOT NULL REFERENCES customers(id),
      sales_rep_id TEXT NOT NULL REFERENCES team_members(id),
      contact_name TEXT NOT NULL,
      contact_position TEXT,
      contact_phone TEXT,
      contact_line_email TEXT,
      call_date TEXT NOT NULL,
      call_time TEXT,
      not_convenient INTEGER NOT NULL DEFAULT 0,
      callback_date TEXT,
      callback_time TEXT,
      duration_minutes INTEGER,
      fleet_isuzu_count INTEGER,
      fleet_other_count INTEGER,
      fleet_pickup INTEGER,
      fleet_truck INTEGER,
      fleet_suv INTEGER,
      fleet_total INTEGER,
      usage_types TEXT,
      usage_status_notes TEXT,
      has_problem_vehicles INTEGER,
      problem_count INTEGER,
      problem_details TEXT,
      service_location TEXT,
      service_reason TEXT,
      main_problems TEXT,
      purchase_timeline TEXT,
      expected_quantity INTEGER,
      interested_models TEXT,
      purchase_purpose TEXT,
      decision_makers TEXT,
      key_factors TEXT,
      interested_services TEXT,
      lead_level TEXT,
      customer_needs TEXT,
      problems_found TEXT,
      business_opportunities TEXT,
      next_actions TEXT NOT NULL DEFAULT '[]',
      next_action_owner TEXT,
      next_action_date TEXT,
      next_action_details TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `)
  db.run(sql`
    CREATE TABLE IF NOT EXISTS deals (
      id TEXT PRIMARY KEY,
      customer_id TEXT NOT NULL REFERENCES customers(id),
      sales_rep_id TEXT NOT NULL REFERENCES team_members(id),
      vehicle_model TEXT NOT NULL,
      quantity INTEGER NOT NULL DEFAULT 1,
      expected_amount REAL,
      stage TEXT NOT NULL DEFAULT 'lead',
      expected_close_date TEXT,
      won_amount REAL,
      notes TEXT,
      source_call_log_id TEXT REFERENCES call_logs(id),
      source_visit_log_id TEXT REFERENCES visit_logs(id),
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
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
  const app = new Hono<{ Bindings: { DB: any; JWT_SECRET: string } }>()
  app.route('/api/reports', reportsRoutes)
  return app
}

function env(db: ReturnType<typeof createDb>) {
  return {
    DB: db as unknown as D1Database,
    JWT_SECRET: TEST_JWT_SECRET,
  }
}

describe('Reports Routes', () => {
  let db: ReturnType<typeof createDb>
  let managerToken: string
  let salesRepToken: string
  let managerId: string
  let rep1Id: string
  let rep2Id: string
  let custAId: string
  let custBId: string
  let custCId: string

  beforeAll(async () => {
    db = createDb()

    managerId = 'mgr-001'
    rep1Id = 'rep-001'
    rep2Id = 'rep-002'

    db.insert(schema.teamMembers).values({
      id: managerId, lineUserId: 'line-mgr', name: 'ผู้จัดการ', role: 'manager', isActive: true,
    }).run()
    db.insert(schema.teamMembers).values({
      id: rep1Id, lineUserId: 'line-rep1', name: 'สมชาย', role: 'sales_rep', isActive: true, territory: 'กรุงเทพ',
    }).run()
    db.insert(schema.teamMembers).values({
      id: rep2Id, lineUserId: 'line-rep2', name: 'สมหญิง', role: 'sales_rep', isActive: true, territory: 'เชียงใหม่',
    }).run()

    custAId = 'cust-a'
    custBId = 'cust-b'
    custCId = 'cust-c'

    db.insert(schema.customers).values({
      id: custAId, name: 'บริษัท A', segment: 'A', assignedTo: rep1Id, status: 'active',
    }).run()
    db.insert(schema.customers).values({
      id: custBId, name: 'บริษัท B', segment: 'B', assignedTo: rep1Id, status: 'active',
    }).run()
    db.insert(schema.customers).values({
      id: custCId, name: 'บริษัท C', segment: 'C', assignedTo: rep2Id, status: 'active',
    }).run()

    managerToken = await createToken({ id: managerId, role: 'manager', name: 'ผู้จัดการ' })
    salesRepToken = await createToken({ id: rep1Id, role: 'sales_rep', name: 'สมชาย' })
  })

  // ================================================================
  // Auth guard
  // ================================================================

  describe('Authorization', () => {
    it('rejects sales rep from all report endpoints', async () => {
      const app = createApp(db)
      const endpoints = [
        '/api/reports/visit-completion?month=2026-08',
        '/api/reports/call-completion?month=2026-08',
        '/api/reports/lead-heatmap',
        '/api/reports/sales-performance',
        '/api/reports/coverage-gaps?month=2026-08',
        '/api/reports/team-leaderboard?month=2026-08',
      ]

      for (const ep of endpoints) {
        const res = await app.request(ep, {
          headers: { Authorization: `Bearer ${salesRepToken}` },
        }, env(db))
        expect(res.status, `${ep} should reject sales_rep`).toBe(403)
      }
    })

    it('rejects unauthenticated requests', async () => {
      const app = createApp(db)
      const res = await app.request('/api/reports/visit-completion?month=2026-08', {}, env(db))
      expect(res.status).toBe(401)
    })
  })

  // ================================================================
  // GET /api/reports/visit-completion
  // ================================================================

  describe('GET /api/reports/visit-completion', () => {
    beforeEach(() => {
      db.run(sql`DELETE FROM visit_plans`)
    })

    it('returns empty array when no plans exist', async () => {
      const app = createApp(db)
      const res = await app.request('/api/reports/visit-completion?month=2026-08', {
        headers: { Authorization: `Bearer ${managerToken}` },
      }, env(db))

      expect(res.status).toBe(200)
      const body = await res.json() as any
      expect(body.success).toBe(true)
      expect(body.data).toEqual([])
    })

    it('returns planned vs completed vs missed grouped by rep', async () => {
      // Rep1: 2 planned, 1 completed, 1 missed
      db.insert(schema.visitPlans).values({
        id: 'vp-1', customerId: custAId, salesRepId: rep1Id,
        month: '2026-08', plannedDate: '2026-08-10', status: 'completed',
      }).run()
      db.insert(schema.visitPlans).values({
        id: 'vp-2', customerId: custBId, salesRepId: rep1Id,
        month: '2026-08', plannedDate: '2026-08-12', status: 'missed',
      }).run()
      db.insert(schema.visitPlans).values({
        id: 'vp-3', customerId: custAId, salesRepId: rep1Id,
        month: '2026-08', plannedDate: '2026-08-20', status: 'planned',
      }).run()
      // Rep2: 1 completed
      db.insert(schema.visitPlans).values({
        id: 'vp-4', customerId: custCId, salesRepId: rep2Id,
        month: '2026-08', plannedDate: '2026-08-15', status: 'completed',
      }).run()

      const app = createApp(db)
      const res = await app.request('/api/reports/visit-completion?month=2026-08', {
        headers: { Authorization: `Bearer ${managerToken}` },
      }, env(db))

      expect(res.status).toBe(200)
      const body = await res.json() as any
      expect(body.success).toBe(true)
      expect(body.data).toHaveLength(2)

      const rep1 = body.data.find((r: any) => r.salesRepId === rep1Id)
      expect(rep1).toBeDefined()
      expect(rep1.planned).toBe(3)
      expect(rep1.completed).toBe(1)
      expect(rep1.missed).toBe(1)

      const rep2 = body.data.find((r: any) => r.salesRepId === rep2Id)
      expect(rep2).toBeDefined()
      expect(rep2.planned).toBe(1)
      expect(rep2.completed).toBe(1)
      expect(rep2.missed).toBe(0)
    })

    it('respects month filter', async () => {
      db.insert(schema.visitPlans).values({
        id: 'vp-08', customerId: custAId, salesRepId: rep1Id,
        month: '2026-08', plannedDate: '2026-08-10', status: 'completed',
      }).run()
      db.insert(schema.visitPlans).values({
        id: 'vp-09', customerId: custAId, salesRepId: rep1Id,
        month: '2026-09', plannedDate: '2026-09-10', status: 'planned',
      }).run()

      const app = createApp(db)
      const res = await app.request('/api/reports/visit-completion?month=2026-08', {
        headers: { Authorization: `Bearer ${managerToken}` },
      }, env(db))

      expect(res.status).toBe(200)
      const body = await res.json() as any
      expect(body.data).toHaveLength(1)
      expect(body.data[0].planned).toBe(1)
      expect(body.data[0].completed).toBe(1)
    })

    it('includes sales rep name in response', async () => {
      db.insert(schema.visitPlans).values({
        id: 'vp-name', customerId: custAId, salesRepId: rep1Id,
        month: '2026-08', plannedDate: '2026-08-10', status: 'completed',
      }).run()

      const app = createApp(db)
      const res = await app.request('/api/reports/visit-completion?month=2026-08', {
        headers: { Authorization: `Bearer ${managerToken}` },
      }, env(db))

      const body = await res.json() as any
      expect(body.data[0].salesRepName).toBe('สมชาย')
    })
  })

  // ================================================================
  // GET /api/reports/call-completion
  // ================================================================

  describe('GET /api/reports/call-completion', () => {
    beforeEach(() => {
      db.run(sql`DELETE FROM call_plans`)
    })

    it('returns empty when no call plans', async () => {
      const app = createApp(db)
      const res = await app.request('/api/reports/call-completion?month=2026-08', {
        headers: { Authorization: `Bearer ${managerToken}` },
      }, env(db))

      expect(res.status).toBe(200)
      const body = await res.json() as any
      expect(body.success).toBe(true)
      expect(body.data).toEqual([])
    })

    it('returns planned vs completed vs missed grouped by rep', async () => {
      db.insert(schema.callPlans).values({
        id: 'cp-1', customerId: custAId, salesRepId: rep1Id,
        month: '2026-08', plannedDate: '2026-08-10', status: 'completed',
      }).run()
      db.insert(schema.callPlans).values({
        id: 'cp-2', customerId: custBId, salesRepId: rep1Id,
        month: '2026-08', plannedDate: '2026-08-12', status: 'missed',
      }).run()
      db.insert(schema.callPlans).values({
        id: 'cp-3', customerId: custCId, salesRepId: rep2Id,
        month: '2026-08', plannedDate: '2026-08-15', status: 'planned',
      }).run()

      const app = createApp(db)
      const res = await app.request('/api/reports/call-completion?month=2026-08', {
        headers: { Authorization: `Bearer ${managerToken}` },
      }, env(db))

      expect(res.status).toBe(200)
      const body = await res.json() as any
      expect(body.success).toBe(true)
      expect(body.data).toHaveLength(2)

      const rep1 = body.data.find((r: any) => r.salesRepId === rep1Id)
      expect(rep1.planned).toBe(2)
      expect(rep1.completed).toBe(1)
      expect(rep1.missed).toBe(1)

      const rep2 = body.data.find((r: any) => r.salesRepId === rep2Id)
      expect(rep2.planned).toBe(1)
      expect(rep2.completed).toBe(0)
      expect(rep2.missed).toBe(0)
    })
  })

  // ================================================================
  // GET /api/reports/lead-heatmap
  // ================================================================

  describe('GET /api/reports/lead-heatmap', () => {
    beforeEach(() => {
      db.run(sql`DELETE FROM call_logs`)
    })

    it('returns zero counts when no call logs', async () => {
      const app = createApp(db)
      const res = await app.request('/api/reports/lead-heatmap', {
        headers: { Authorization: `Bearer ${managerToken}` },
      }, env(db))

      expect(res.status).toBe(200)
      const body = await res.json() as any
      expect(body.success).toBe(true)
      expect(body.data.hot).toBe(0)
      expect(body.data.warm).toBe(0)
      expect(body.data.future).toBe(0)
      expect(body.data.maintain).toBe(0)
      expect(body.data.inactive).toBe(0)
    })

    it('counts lead levels from call logs', async () => {
      db.insert(schema.callLogs).values({
        id: 'cl-1', customerId: custAId, salesRepId: rep1Id,
        contactName: 'A', callDate: '2026-08-10', nextActions: [],
        leadLevel: 'hot',
      }).run()
      db.insert(schema.callLogs).values({
        id: 'cl-2', customerId: custBId, salesRepId: rep1Id,
        contactName: 'B', callDate: '2026-08-10', nextActions: [],
        leadLevel: 'warm',
      }).run()
      db.insert(schema.callLogs).values({
        id: 'cl-3', customerId: custCId, salesRepId: rep2Id,
        contactName: 'C', callDate: '2026-08-10', nextActions: [],
        leadLevel: 'hot',
      }).run()

      const app = createApp(db)
      const res = await app.request('/api/reports/lead-heatmap', {
        headers: { Authorization: `Bearer ${managerToken}` },
      }, env(db))

      expect(res.status).toBe(200)
      const body = await res.json() as any
      expect(body.data.hot).toBe(2)
      expect(body.data.warm).toBe(1)
      expect(body.data.future).toBe(0)
      expect(body.data.maintain).toBe(0)
      expect(body.data.inactive).toBe(0)
    })

    it('ignores call logs with null lead level', async () => {
      db.insert(schema.callLogs).values({
        id: 'cl-null', customerId: custAId, salesRepId: rep1Id,
        contactName: 'A', callDate: '2026-08-10', nextActions: [],
        leadLevel: null,
      }).run()

      const app = createApp(db)
      const res = await app.request('/api/reports/lead-heatmap', {
        headers: { Authorization: `Bearer ${managerToken}` },
      }, env(db))

      const body = await res.json() as any
      expect(body.data.hot).toBe(0)
    })
  })

  // ================================================================
  // GET /api/reports/sales-performance
  // ================================================================

  describe('GET /api/reports/sales-performance', () => {
    beforeEach(() => {
      db.run(sql`DELETE FROM deals`)
    })

    it('returns empty when no deals', async () => {
      const app = createApp(db)
      const res = await app.request('/api/reports/sales-performance', {
        headers: { Authorization: `Bearer ${managerToken}` },
      }, env(db))

      expect(res.status).toBe(200)
      const body = await res.json() as any
      expect(body.success).toBe(true)
      expect(body.data).toEqual([])
    })

    it('returns deals won count and total value by rep', async () => {
      // Rep1: 2 won deals, Rep2: 1 won
      db.insert(schema.deals).values({
        id: 'd-1', customerId: custAId, salesRepId: rep1Id,
        vehicleModel: 'D-MAX', quantity: 1, stage: 'won', wonAmount: 800000,
      }).run()
      db.insert(schema.deals).values({
        id: 'd-2', customerId: custBId, salesRepId: rep1Id,
        vehicleModel: 'MU-X', quantity: 1, stage: 'won', wonAmount: 1200000,
      }).run()
      db.insert(schema.deals).values({
        id: 'd-3', customerId: custCId, salesRepId: rep2Id,
        vehicleModel: 'D-MAX', quantity: 2, stage: 'won', wonAmount: 1600000,
      }).run()
      // Lost deal should not count
      db.insert(schema.deals).values({
        id: 'd-4', customerId: custAId, salesRepId: rep1Id,
        vehicleModel: 'D-MAX', quantity: 1, stage: 'lost',
      }).run()

      const app = createApp(db)
      const res = await app.request('/api/reports/sales-performance', {
        headers: { Authorization: `Bearer ${managerToken}` },
      }, env(db))

      expect(res.status).toBe(200)
      const body = await res.json() as any

      const rep1 = body.data.find((r: any) => r.salesRepId === rep1Id)
      expect(rep1).toBeDefined()
      expect(rep1.dealsWon).toBe(2)
      expect(rep1.totalValue).toBe(2000000)
      expect(rep1.totalDeals).toBe(3) // includes lost

      const rep2 = body.data.find((r: any) => r.salesRepId === rep2Id)
      expect(rep2.dealsWon).toBe(1)
      expect(rep2.totalValue).toBe(1600000)
      expect(rep2.totalDeals).toBe(1)
    })

    it('calculates win rate', async () => {
      db.insert(schema.deals).values({
        id: 'd-w1', customerId: custAId, salesRepId: rep1Id,
        vehicleModel: 'D-MAX', quantity: 1, stage: 'won', wonAmount: 500000,
      }).run()
      db.insert(schema.deals).values({
        id: 'd-l1', customerId: custBId, salesRepId: rep1Id,
        vehicleModel: 'D-MAX', quantity: 1, stage: 'lost',
      }).run()
      db.insert(schema.deals).values({
        id: 'd-l2', customerId: custAId, salesRepId: rep1Id,
        vehicleModel: 'MU-X', quantity: 1, stage: 'lost',
      }).run()

      const app = createApp(db)
      const res = await app.request('/api/reports/sales-performance', {
        headers: { Authorization: `Bearer ${managerToken}` },
      }, env(db))

      const body = await res.json() as any
      expect(body.data[0].winRate).toBeCloseTo(33.33, 1) // 1/3
    })
  })

  // ================================================================
  // GET /api/reports/coverage-gaps
  // ================================================================

  describe('GET /api/reports/coverage-gaps', () => {
    beforeEach(() => {
      db.run(sql`DELETE FROM visit_plans`)
      db.run(sql`DELETE FROM visit_logs`)
      db.run(sql`DELETE FROM call_plans`)
      db.run(sql`DELETE FROM call_logs`)
    })

    it('returns all active customers when no visits/calls', async () => {
      const app = createApp(db)
      const res = await app.request('/api/reports/coverage-gaps?month=2026-08', {
        headers: { Authorization: `Bearer ${managerToken}` },
      }, env(db))

      expect(res.status).toBe(200)
      const body = await res.json() as any
      expect(body.success).toBe(true)
      // All 3 active customers should be gaps
      expect(body.data).toHaveLength(3)
    })

    it('excludes customers with completed visits in the month', async () => {
      db.insert(schema.visitPlans).values({
        id: 'vp-ok', customerId: custAId, salesRepId: rep1Id,
        month: '2026-08', plannedDate: '2026-08-10', status: 'completed',
      }).run()

      const app = createApp(db)
      const res = await app.request('/api/reports/coverage-gaps?month=2026-08', {
        headers: { Authorization: `Bearer ${managerToken}` },
      }, env(db))

      const body = await res.json() as any
      // custAId visited, so only custB + custC should be gaps
      expect(body.data).toHaveLength(2)
      const customerIds = body.data.map((g: any) => g.customerId)
      expect(customerIds).not.toContain(custAId)
    })

    it('excludes customers with completed calls in the month', async () => {
      db.insert(schema.callPlans).values({
        id: 'cp-ok', customerId: custAId, salesRepId: rep1Id,
        month: '2026-08', plannedDate: '2026-08-10', status: 'completed',
      }).run()

      const app = createApp(db)
      const res = await app.request('/api/reports/coverage-gaps?month=2026-08', {
        headers: { Authorization: `Bearer ${managerToken}` },
      }, env(db))

      const body = await res.json() as any
      const customerIds = body.data.map((g: any) => g.customerId)
      expect(customerIds).not.toContain(custAId)
    })

    it('includes customer name, segment, and rep name', async () => {
      const app = createApp(db)
      const res = await app.request('/api/reports/coverage-gaps?month=2026-08', {
        headers: { Authorization: `Bearer ${managerToken}` },
      }, env(db))

      const body = await res.json() as any
      const custA = body.data.find((g: any) => g.customerId === custAId)
      expect(custA.customerName).toBe('บริษัท A')
      expect(custA.segment).toBe('A')
      expect(custA.salesRepName).toBe('สมชาย')
      expect(custA.daysOverdue).toBeGreaterThan(0)
    })
  })

  // ================================================================
  // GET /api/reports/team-leaderboard
  // ================================================================

  describe('GET /api/reports/team-leaderboard', () => {
    beforeEach(() => {
      db.run(sql`DELETE FROM visit_plans`)
      db.run(sql`DELETE FROM call_plans`)
      db.run(sql`DELETE FROM deals`)
    })

    it('returns all active sales reps with zero scores when no activity', async () => {
      const app = createApp(db)
      const res = await app.request('/api/reports/team-leaderboard?month=2026-08', {
        headers: { Authorization: `Bearer ${managerToken}` },
      }, env(db))

      expect(res.status).toBe(200)
      const body = await res.json() as any
      expect(body.success).toBe(true)
      expect(body.data).toHaveLength(2) // 2 active sales reps

      for (const rep of body.data) {
        expect(rep.visitCompleted).toBe(0)
        expect(rep.callCompleted).toBe(0)
        expect(rep.dealsWon).toBe(0)
        expect(rep.score).toBe(0)
      }
    })

    it('computes scores from visits + calls + deals', async () => {
      // Rep1: 3 visits done, 2 calls done, 1 deal won
      db.insert(schema.visitPlans).values({
        id: 'vp-l1', customerId: custAId, salesRepId: rep1Id,
        month: '2026-08', plannedDate: '2026-08-10', status: 'completed',
      }).run()
      db.insert(schema.visitPlans).values({
        id: 'vp-l2', customerId: custBId, salesRepId: rep1Id,
        month: '2026-08', plannedDate: '2026-08-12', status: 'completed',
      }).run()
      db.insert(schema.visitPlans).values({
        id: 'vp-l3', customerId: custAId, salesRepId: rep1Id,
        month: '2026-08', plannedDate: '2026-08-15', status: 'completed',
      }).run()

      db.insert(schema.callPlans).values({
        id: 'cp-l1', customerId: custAId, salesRepId: rep1Id,
        month: '2026-08', plannedDate: '2026-08-10', status: 'completed',
      }).run()
      db.insert(schema.callPlans).values({
        id: 'cp-l2', customerId: custBId, salesRepId: rep1Id,
        month: '2026-08', plannedDate: '2026-08-12', status: 'completed',
      }).run()

      db.insert(schema.deals).values({
        id: 'd-l1', customerId: custAId, salesRepId: rep1Id,
        vehicleModel: 'D-MAX', quantity: 1, stage: 'won', wonAmount: 500000,
      }).run()

      // Rep2: 1 visit, 0 calls, 0 deals
      db.insert(schema.visitPlans).values({
        id: 'vp-l4', customerId: custCId, salesRepId: rep2Id,
        month: '2026-08', plannedDate: '2026-08-20', status: 'completed',
      }).run()

      const app = createApp(db)
      const res = await app.request('/api/reports/team-leaderboard?month=2026-08', {
        headers: { Authorization: `Bearer ${managerToken}` },
      }, env(db))

      expect(res.status).toBe(200)
      const body = await res.json() as any

      // Sorted by score descending
      expect(body.data[0].salesRepId).toBe(rep1Id)
      expect(body.data[0].visitCompleted).toBe(3)
      expect(body.data[0].callCompleted).toBe(2)
      expect(body.data[0].dealsWon).toBe(1)
      // score = 3*1 + 2*1 + 1*10 = 15
      expect(body.data[0].score).toBe(15)

      expect(body.data[1].salesRepId).toBe(rep2Id)
      expect(body.data[1].visitCompleted).toBe(1)
      expect(body.data[1].score).toBe(1)
    })
  })
})
