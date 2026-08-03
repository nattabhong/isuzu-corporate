import { describe, it, expect, beforeAll, beforeEach } from 'vitest'
import { Hono } from 'hono'
import { SignJWT } from 'jose'
import Database from 'better-sqlite3'
import { drizzle } from 'drizzle-orm/better-sqlite3'
import { sql } from 'drizzle-orm'
import * as schema from '../db/schema'
import { callRoutes } from './calls'

const TEST_JWT_SECRET = 'test-jwt-secret-calls'

type TestEnv = {
  DB: any
  JWT_SECRET: string
}

function createApp() {
  const app = new Hono<{ Bindings: TestEnv }>()
  app.route('/api', callRoutes)
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
        lost_reason TEXT,
        competitor_brand TEXT,
        discount_amount REAL,
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
      next_actions TEXT NOT NULL,
      next_action_owner TEXT,
      next_action_date TEXT,
      next_action_details TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `)
  return db
}

// Helper to clear all data in correct FK order
function clearAll(db: ReturnType<typeof createDb>) {
  db.run(sql`DELETE FROM call_logs`)
  db.run(sql`DELETE FROM call_plans`)
  db.run(sql`DELETE FROM customers`)
}

async function createManagerToken(): Promise<string> {
  return new SignJWT({ id: 'manager-1', role: 'manager', name: 'Manager Test' })
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime('1h')
    .setIssuedAt()
    .sign(new TextEncoder().encode(TEST_JWT_SECRET))
}

async function createRepToken(repId = 'rep-1'): Promise<string> {
  return new SignJWT({ id: repId, role: 'sales_rep', name: 'Sales Rep' })
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime('1h')
    .setIssuedAt()
    .sign(new TextEncoder().encode(TEST_JWT_SECRET))
}

function authEnv(db: ReturnType<typeof createDb>): TestEnv {
  return { DB: db, JWT_SECRET: TEST_JWT_SECRET }
}

function authHeaders(token: string) {
  return { Authorization: 'Bearer ' + token }
}

describe('Call Routes', () => {
  let db: ReturnType<typeof createDb>
  let app: ReturnType<typeof createApp>
  let managerToken: string
  let rep1Token: string
  let rep2Token: string

  beforeAll(async () => {
    db = createDb()
    app = createApp()
    managerToken = await createManagerToken()
    rep1Token = await createRepToken('rep-1')
    rep2Token = await createRepToken('rep-2')

    // Seed team members
    db.insert(schema.teamMembers).values({
      id: 'manager-1', lineUserId: 'line-mgr-1', name: 'Manager', role: 'manager',
    }).run()
    db.insert(schema.teamMembers).values({
      id: 'rep-1', lineUserId: 'line-rep-1', name: 'Rep One', role: 'sales_rep',
    }).run()
    db.insert(schema.teamMembers).values({
      id: 'rep-2', lineUserId: 'line-rep-2', name: 'Rep Two', role: 'sales_rep',
    }).run()

    // Seed customers
    db.insert(schema.customers).values({
      id: 'cust-a', name: 'ACME Corp', assignedTo: 'rep-1', segment: 'A', status: 'active',
    }).run()
    db.insert(schema.customers).values({
      id: 'cust-b', name: 'Beta Ltd', assignedTo: 'rep-2', segment: 'B', status: 'active',
    }).run()
    db.insert(schema.customers).values({
      id: 'cust-c', name: 'Gamma Co', assignedTo: null, segment: 'C', status: 'active',
    }).run()
    db.insert(schema.customers).values({
      id: 'cust-d', name: 'Delta Inc', assignedTo: 'rep-1', segment: 'A', status: 'active',
    }).run()
    db.insert(schema.customers).values({
      id: 'cust-e', name: 'Epsilon LLC', assignedTo: 'rep-1', segment: 'C', status: 'inactive',
    }).run()
  })

  // ======================== Call Plans ========================

  describe('POST /call-plans (create call plan)', () => {
    it('creates a call plan with valid data', async () => {
      const res = await app.request('/api/call-plans', {
        method: 'POST',
        headers: { ...authHeaders(managerToken), 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerId: 'cust-a',
          salesRepId: 'rep-1',
          month: '2026-08',
          plannedDate: '2026-08-10',
          callPurpose: 'check_in',
        }),
      }, authEnv(db))

      expect(res.status).toBe(201)
      const body = await res.json() as any
      expect(body.success).toBe(true)
      expect(body.data.customerId).toBe('cust-a')
      expect(body.data.salesRepId).toBe('rep-1')
      expect(body.data.month).toBe('2026-08')
      expect(body.data.callPurpose).toBe('check_in')
      expect(body.data.status).toBe('planned')
      expect(body.data.id).toBeDefined()
    })

    it('defaults call purpose to check_in when not provided', async () => {
      const res = await app.request('/api/call-plans', {
        method: 'POST',
        headers: { ...authHeaders(managerToken), 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerId: 'cust-a',
          salesRepId: 'rep-1',
          month: '2026-08',
          plannedDate: '2026-08-10',
        }),
      }, authEnv(db))

      expect(res.status).toBe(201)
      const body = await res.json() as any
      expect(body.data.callPurpose).toBe('check_in')
    })

    it('returns 400 when required fields are missing', async () => {
      const res = await app.request('/api/call-plans', {
        method: 'POST',
        headers: { ...authHeaders(managerToken), 'Content-Type': 'application/json' },
        body: JSON.stringify({ callPurpose: 'offer' }),
      }, authEnv(db))

      expect(res.status).toBe(400)
    })

    it('returns 401 without auth token', async () => {
      const res = await app.request('/api/call-plans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ customerId: 'cust-a', salesRepId: 'rep-1', month: '2026-08', plannedDate: '2026-08-10' }),
      }, authEnv(db))

      expect(res.status).toBe(401)
    })
  })

  describe('GET /call-plans (list call plans)', () => {
    beforeEach(() => {
      clearAll(db)
      // Re-seed customers for FK
      db.insert(schema.customers).values({
        id: 'cust-a', name: 'ACME Corp', assignedTo: 'rep-1', segment: 'A', status: 'active',
      }).run()
      db.insert(schema.customers).values({
        id: 'cust-b', name: 'Beta Ltd', assignedTo: 'rep-2', segment: 'B', status: 'active',
      }).run()

      db.insert(schema.callPlans).values({
        id: 'cp-a', customerId: 'cust-a', salesRepId: 'rep-1', month: '2026-08',
        plannedDate: '2026-08-10', callPurpose: 'check_in', status: 'planned',
      }).run()
      db.insert(schema.callPlans).values({
        id: 'cp-b', customerId: 'cust-b', salesRepId: 'rep-2', month: '2026-08',
        plannedDate: '2026-08-15', callPurpose: 'offer', status: 'planned',
      }).run()
      db.insert(schema.callPlans).values({
        id: 'cp-c', customerId: 'cust-a', salesRepId: 'rep-1', month: '2026-07',
        plannedDate: '2026-07-20', callPurpose: 'follow_up', status: 'completed',
      }).run()
    })

    it('manager sees all call plans', async () => {
      const res = await app.request('/api/call-plans', {
        headers: authHeaders(managerToken),
      }, authEnv(db))

      expect(res.status).toBe(200)
      const body = await res.json() as any
      expect(body.success).toBe(true)
      expect(body.data).toHaveLength(3)
    })

    it('sales rep sees only own call plans', async () => {
      const res = await app.request('/api/call-plans', {
        headers: authHeaders(rep1Token),
      }, authEnv(db))

      expect(res.status).toBe(200)
      const body = await res.json() as any
      expect(body.success).toBe(true)
      expect(body.data).toHaveLength(2)
      expect(body.data.every((p: any) => p.salesRepId === 'rep-1')).toBe(true)
    })

    it('filters by month', async () => {
      const res = await app.request('/api/call-plans?month=2026-07', {
        headers: authHeaders(managerToken),
      }, authEnv(db))

      expect(res.status).toBe(200)
      const body = await res.json() as any
      expect(body.data).toHaveLength(1)
      expect(body.data[0].month).toBe('2026-07')
    })

    it('filters by month for sales rep scope', async () => {
      const res = await app.request('/api/call-plans?month=2026-08', {
        headers: authHeaders(rep1Token),
      }, authEnv(db))

      expect(res.status).toBe(200)
      const body = await res.json() as any
      expect(body.data).toHaveLength(1)
      expect(body.data[0].id).toBe('cp-a')
    })

    it('returns 401 without auth token', async () => {
      const res = await app.request('/api/call-plans', {}, authEnv(db))
      expect(res.status).toBe(401)
    })
  })

  describe('POST /call-plans/generate (auto-generate)', () => {
    beforeEach(() => {
      clearAll(db)
      // Re-seed customers with various segments for generation
      db.insert(schema.customers).values({
        id: 'cust-a', name: 'ACME Corp', assignedTo: 'rep-1', segment: 'A', status: 'active',
      }).run()
      db.insert(schema.customers).values({
        id: 'cust-b', name: 'Beta Ltd', assignedTo: 'rep-2', segment: 'B', status: 'active',
      }).run()
      db.insert(schema.customers).values({
        id: 'cust-c', name: 'Gamma Co', assignedTo: null, segment: 'C', status: 'active',
      }).run()
      db.insert(schema.customers).values({
        id: 'cust-d', name: 'Delta Inc', assignedTo: 'rep-1', segment: 'C', status: 'active',
      }).run()
      db.insert(schema.customers).values({
        id: 'cust-e', name: 'Epsilon LLC', assignedTo: 'rep-1', segment: 'A', status: 'inactive',
      }).run()
    })

    it('manager can generate monthly call plans', async () => {
      const res = await app.request('/api/call-plans/generate', {
        method: 'POST',
        headers: { ...authHeaders(managerToken), 'Content-Type': 'application/json' },
        body: JSON.stringify({ month: '2026-09' }),
      }, authEnv(db))

      expect(res.status).toBe(201)
      const body = await res.json() as any
      expect(body.success).toBe(true)
      expect(Array.isArray(body.data)).toBe(true)
      // 4 active customers with reps: cust-a(A), cust-b(B), cust-d(C) — 2+2+1 = 5 plans
      expect(body.data.length).toBeGreaterThanOrEqual(3)
    })

    it('segment A customers get 2 calls per month', async () => {
      const res = await app.request('/api/call-plans/generate', {
        method: 'POST',
        headers: { ...authHeaders(managerToken), 'Content-Type': 'application/json' },
        body: JSON.stringify({ month: '2026-09' }),
      }, authEnv(db))

      const body = await res.json() as any
      const custAPlans = body.data.filter((p: any) => p.customerId === 'cust-a')
      expect(custAPlans.length).toBe(2)
    })

    it('segment C customers get 1 call per month', async () => {
      const res = await app.request('/api/call-plans/generate', {
        method: 'POST',
        headers: { ...authHeaders(managerToken), 'Content-Type': 'application/json' },
        body: JSON.stringify({ month: '2026-09' }),
      }, authEnv(db))

      const body = await res.json() as any
      const custDPlans = body.data.filter((p: any) => p.customerId === 'cust-d')
      expect(custDPlans.length).toBe(1)
    })

    it('skips inactive customers', async () => {
      const res = await app.request('/api/call-plans/generate', {
        method: 'POST',
        headers: { ...authHeaders(managerToken), 'Content-Type': 'application/json' },
        body: JSON.stringify({ month: '2026-09' }),
      }, authEnv(db))

      const body = await res.json() as any
      const inactivePlans = body.data.filter((p: any) => p.customerId === 'cust-e')
      expect(inactivePlans.length).toBe(0)
    })

    it('skips customers without assigned rep', async () => {
      const res = await app.request('/api/call-plans/generate', {
        method: 'POST',
        headers: { ...authHeaders(managerToken), 'Content-Type': 'application/json' },
        body: JSON.stringify({ month: '2026-09' }),
      }, authEnv(db))

      const body = await res.json() as any
      const noRepPlans = body.data.filter((p: any) => p.customerId === 'cust-c')
      expect(noRepPlans.length).toBe(0)
    })

    it('skips already-planned entries for the same month', async () => {
      // Pre-create a plan for cust-a in 2026-09
      db.insert(schema.callPlans).values({
        id: 'existing-plan', customerId: 'cust-a', salesRepId: 'rep-1',
        month: '2026-09', plannedDate: '2026-09-05', callPurpose: 'check_in', status: 'planned',
      }).run()

      const res = await app.request('/api/call-plans/generate', {
        method: 'POST',
        headers: { ...authHeaders(managerToken), 'Content-Type': 'application/json' },
        body: JSON.stringify({ month: '2026-09' }),
      }, authEnv(db))

      const body = await res.json() as any
      const custAPlans = body.data.filter((p: any) => p.customerId === 'cust-a')
      // cust-a already has 1 plan, so only 1 more should be generated (for 2 total)
      expect(custAPlans.length).toBe(1)
    })

    it('returns 403 for non-manager', async () => {
      const res = await app.request('/api/call-plans/generate', {
        method: 'POST',
        headers: { ...authHeaders(rep1Token), 'Content-Type': 'application/json' },
        body: JSON.stringify({ month: '2026-09' }),
      }, authEnv(db))

      expect(res.status).toBe(403)
    })

    it('returns 400 for invalid month format', async () => {
      const res = await app.request('/api/call-plans/generate', {
        method: 'POST',
        headers: { ...authHeaders(managerToken), 'Content-Type': 'application/json' },
        body: JSON.stringify({ month: 'bad-month' }),
      }, authEnv(db))

      expect(res.status).toBe(400)
    })
  })

  describe('PATCH /call-plans/:id (update call plan)', () => {
    beforeEach(() => {
      clearAll(db)
      db.insert(schema.customers).values({
        id: 'cust-a', name: 'ACME Corp', assignedTo: 'rep-1', segment: 'A', status: 'active',
      }).run()
      db.insert(schema.callPlans).values({
        id: 'cp-patch', customerId: 'cust-a', salesRepId: 'rep-1', month: '2026-08',
        plannedDate: '2026-08-10', callPurpose: 'check_in', status: 'planned',
      }).run()
    })

    it('updates call plan status', async () => {
      const res = await app.request('/api/call-plans/cp-patch', {
        method: 'PATCH',
        headers: { ...authHeaders(managerToken), 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'completed' }),
      }, authEnv(db))

      expect(res.status).toBe(200)
      const body = await res.json() as any
      expect(body.success).toBe(true)
      expect(body.data.status).toBe('completed')
    })

    it('returns 404 for non-existent call plan', async () => {
      const res = await app.request('/api/call-plans/non-existent', {
        method: 'PATCH',
        headers: { ...authHeaders(managerToken), 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'completed' }),
      }, authEnv(db))

      expect(res.status).toBe(404)
    })

    it('returns 401 without auth token', async () => {
      const res = await app.request('/api/call-plans/cp-patch', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'completed' }),
      }, authEnv(db))

      expect(res.status).toBe(401)
    })
  })

  // ======================== Call Logs ========================

  describe('POST /call-logs (record full 10-section call)', () => {
    beforeEach(() => {
      clearAll(db)
      db.insert(schema.customers).values({
        id: 'cust-a', name: 'ACME Corp', assignedTo: 'rep-1', segment: 'A', status: 'active',
      }).run()
    })

    it('creates a call log with full 10-section data', async () => {
      const res = await app.request('/api/call-logs', {
        method: 'POST',
        headers: { ...authHeaders(managerToken), 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerId: 'cust-a',
          contactName: 'Alice',
          contactPosition: 'CEO',
          callDate: '2026-08-10',
          callTime: '10:30',
          durationMinutes: 15,
          fleetIsuzuCount: 5,
          fleetOtherCount: 2,
          fleetPickup: 3,
          fleetTruck: 2,
          fleetSuv: 1,
          usageTypes: ['ขนส่งสินค้า'],
          usageStatusNotes: 'ใช้งานปกติ',
          hasProblemVehicles: true,
          problemCount: 1,
          problemDetails: 'รถหมายเลข 3 มีปัญหาเกียร์',
          purchaseTimeline: '6m',
          expectedQuantity: 3,
          interestedModels: ['กระบะ 4 ประตู (Cab4 / Hi-Lander)'],
          purchasePurpose: ['ขยายธุรกิจ'],
          decisionMakers: [{ role: 'CEO', namePosition: 'Alice' }],
          keyFactors: ['ราคารถ', 'ค่างวด'],
          interestedServices: ['เสนอรถใหม่', 'ขอใบเสนอราคา'],
          leadLevel: 'hot',
          customerNeeds: 'ต้องการรถใหม่ 3 คัน',
          problemsFound: 'เกียร์มีปัญหา',
          businessOpportunities: ['ขายรถใหม่', 'บริการซ่อม'],
          nextActions: ['โทรติดตามอีกครั้ง', 'ส่งใบเสนอราคา'],
          nextActionOwner: 'rep-1',
          nextActionDate: '2026-08-15',
          nextActionDetails: 'ส่งใบเสนอราคา D-Max 1.9 S จำนวน 3 คัน',
        }),
      }, authEnv(db))

      expect(res.status).toBe(201)
      const body = await res.json() as any
      expect(body.success).toBe(true)
      expect(body.data.contactName).toBe('Alice')
      expect(body.data.contactPosition).toBe('CEO')
      expect(body.data.fleetIsuzuCount).toBe(5)
      expect(body.data.leadLevel).toBe('hot')
      expect(body.data.nextActions).toEqual(['โทรติดตามอีกครั้ง', 'ส่งใบเสนอราคา'])
      expect(body.data.businessOpportunities).toEqual(['ขายรถใหม่', 'บริการซ่อม'])
    })

    it('returns 400 when contactName is missing', async () => {
      const res = await app.request('/api/call-logs', {
        method: 'POST',
        headers: { ...authHeaders(managerToken), 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerId: 'cust-a',
          callDate: '2026-08-10',
          nextActions: ['โทรติดตามอีกครั้ง'],
        }),
      }, authEnv(db))

      expect(res.status).toBe(400)
    })

    it('returns 400 when nextActions is empty', async () => {
      const res = await app.request('/api/call-logs', {
        method: 'POST',
        headers: { ...authHeaders(managerToken), 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerId: 'cust-a',
          contactName: 'Bob',
          callDate: '2026-08-10',
          nextActions: [],
        }),
      }, authEnv(db))

      expect(res.status).toBe(400)
    })

    it('auto-sets salesRepId from auth user', async () => {
      const res = await app.request('/api/call-logs', {
        method: 'POST',
        headers: { ...authHeaders(rep1Token), 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerId: 'cust-a',
          contactName: 'Charlie',
          callDate: '2026-08-10',
          nextActions: ['นัดเข้าเยี่ยมบริษัท'],
        }),
      }, authEnv(db))

      expect(res.status).toBe(201)
      const body = await res.json() as any
      expect(body.data.salesRepId).toBe('rep-1')
    })

    it('marks associated call plan as completed', async () => {
      db.insert(schema.callPlans).values({
        id: 'cp-link', customerId: 'cust-a', salesRepId: 'rep-1',
        month: '2026-08', plannedDate: '2026-08-10', callPurpose: 'check_in', status: 'planned',
      }).run()

      const res = await app.request('/api/call-logs', {
        method: 'POST',
        headers: { ...authHeaders(rep1Token), 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerId: 'cust-a',
          callPlanId: 'cp-link',
          contactName: 'Alice',
          callDate: '2026-08-10',
          nextActions: ['โทรติดตามอีกครั้ง'],
        }),
      }, authEnv(db))

      expect(res.status).toBe(201)
      const body = await res.json() as any
      expect(body.data.callPlanId).toBe('cp-link')

      // Verify plan was auto-completed
      const plan = db.select().from(schema.callPlans).where(sql`id = 'cp-link'`).get() as any
      expect(plan.status).toBe('completed')
    })

    it('returns 401 without auth token', async () => {
      const res = await app.request('/api/call-logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ customerId: 'cust-a', contactName: 'Test', callDate: '2026-08-10', nextActions: ['โทรติดตามอีกครั้ง'] }),
      }, authEnv(db))

      expect(res.status).toBe(401)
    })
  })

  describe('GET /call-logs (list call logs)', () => {
    beforeEach(() => {
      clearAll(db)
      db.insert(schema.customers).values({
        id: 'cust-a', name: 'ACME Corp', assignedTo: 'rep-1', segment: 'A', status: 'active',
      }).run()
      db.insert(schema.customers).values({
        id: 'cust-b', name: 'Beta Ltd', assignedTo: 'rep-2', segment: 'B', status: 'active',
      }).run()

      db.insert(schema.callLogs).values({
        id: 'cl-a', customerId: 'cust-a', salesRepId: 'rep-1',
        contactName: 'Alice', callDate: '2026-08-10', nextActions: ['โทรติดตามอีกครั้ง'],
      }).run()
      db.insert(schema.callLogs).values({
        id: 'cl-b', customerId: 'cust-b', salesRepId: 'rep-2',
        contactName: 'Bob', callDate: '2026-08-12', nextActions: ['ส่งใบเสนอราคา'],
      }).run()
      db.insert(schema.callLogs).values({
        id: 'cl-c', customerId: 'cust-a', salesRepId: 'rep-1',
        contactName: 'Charlie', callDate: '2026-08-15', nextActions: ['นัดเข้าเยี่ยมบริษัท'],
      }).run()
    })

    it('manager sees all call logs', async () => {
      const res = await app.request('/api/call-logs', {
        headers: authHeaders(managerToken),
      }, authEnv(db))

      expect(res.status).toBe(200)
      const body = await res.json() as any
      expect(body.success).toBe(true)
      expect(body.data).toHaveLength(3)
    })

    it('sales rep sees only own call logs', async () => {
      const res = await app.request('/api/call-logs', {
        headers: authHeaders(rep1Token),
      }, authEnv(db))

      expect(res.status).toBe(200)
      const body = await res.json() as any
      expect(body.success).toBe(true)
      expect(body.data).toHaveLength(2)
      expect(body.data.every((l: any) => l.salesRepId === 'rep-1')).toBe(true)
    })

    it('returns 401 without auth token', async () => {
      const res = await app.request('/api/call-logs', {}, authEnv(db))
      expect(res.status).toBe(401)
    })
  })

  describe('GET /call-logs/:id (single call log detail)', () => {
    beforeEach(() => {
      clearAll(db)
      db.insert(schema.customers).values({
        id: 'cust-a', name: 'ACME Corp', assignedTo: 'rep-1', segment: 'A', status: 'active',
      }).run()

      db.insert(schema.callLogs).values({
        id: 'cl-detail', customerId: 'cust-a', salesRepId: 'rep-1',
        contactName: 'Alice', contactPosition: 'CEO', contactPhone: '0812345678',
        callDate: '2026-08-10', callTime: '10:30', durationMinutes: 15,
        fleetIsuzuCount: 5, fleetOtherCount: 2, fleetPickup: 3, fleetTruck: 2, fleetSuv: 1,
        usageTypes: ['ขนส่งสินค้า'],
        hasProblemVehicles: true, problemCount: 1, problemDetails: 'เกียร์มีปัญหา',
        purchaseTimeline: '6m', expectedQuantity: 3,
        interestedModels: ['กระบะ 4 ประตู (Cab4 / Hi-Lander)'],
        decisionMakers: [{ role: 'CEO', namePosition: 'Alice' }],
        leadLevel: 'hot', customerNeeds: 'ต้องการรถใหม่',
        nextActions: ['โทรติดตามอีกครั้ง'],
        nextActionOwner: 'rep-1', nextActionDate: '2026-08-15',
      }).run()
    })

    it('returns full call log with all sections', async () => {
      const res = await app.request('/api/call-logs/cl-detail', {
        headers: authHeaders(managerToken),
      }, authEnv(db))

      expect(res.status).toBe(200)
      const body = await res.json() as any
      expect(body.success).toBe(true)
      expect(body.data.id).toBe('cl-detail')
      expect(body.data.contactName).toBe('Alice')
      expect(body.data.fleetIsuzuCount).toBe(5)
      expect(body.data.leadLevel).toBe('hot')
      expect(body.data.nextActions).toEqual(['โทรติดตามอีกครั้ง'])
      expect(body.data.decisionMakers).toEqual([{ role: 'CEO', namePosition: 'Alice' }])
    })

    it('returns 404 for non-existent call log', async () => {
      const res = await app.request('/api/call-logs/non-existent', {
        headers: authHeaders(managerToken),
      }, authEnv(db))

      expect(res.status).toBe(404)
    })
  })

  describe('PATCH /call-logs/:id (update call log)', () => {
    beforeEach(() => {
      clearAll(db)
      db.insert(schema.customers).values({
        id: 'cust-a', name: 'ACME Corp', assignedTo: 'rep-1', segment: 'A', status: 'active',
      }).run()

      db.insert(schema.callLogs).values({
        id: 'cl-update', customerId: 'cust-a', salesRepId: 'rep-1',
        contactName: 'Alice', callDate: '2026-08-10', nextActions: ['โทรติดตามอีกครั้ง'],
      }).run()
    })

    it('updates call log fields', async () => {
      const res = await app.request('/api/call-logs/cl-update', {
        method: 'PATCH',
        headers: { ...authHeaders(managerToken), 'Content-Type': 'application/json' },
        body: JSON.stringify({
          leadLevel: 'warm',
          customerNeeds: 'ต้องการบริการหลังการขาย',
          nextActions: ['ส่งแพ็กเกจงานบริการ'],
        }),
      }, authEnv(db))

      expect(res.status).toBe(200)
      const body = await res.json() as any
      expect(body.success).toBe(true)
      expect(body.data.leadLevel).toBe('warm')
      expect(body.data.customerNeeds).toBe('ต้องการบริการหลังการขาย')
      expect(body.data.nextActions).toEqual(['ส่งแพ็กเกจงานบริการ'])
    })

    it('returns 404 for non-existent call log', async () => {
      const res = await app.request('/api/call-logs/non-existent', {
        method: 'PATCH',
        headers: { ...authHeaders(managerToken), 'Content-Type': 'application/json' },
        body: JSON.stringify({ leadLevel: 'hot' }),
      }, authEnv(db))

      expect(res.status).toBe(404)
    })

    it('returns 401 without auth token', async () => {
      const res = await app.request('/api/call-logs/cl-update', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leadLevel: 'hot' }),
      }, authEnv(db))

      expect(res.status).toBe(401)
    })
  })

  describe('GET /call-logs/:id/script (generate script)', () => {
    beforeEach(() => {
      clearAll(db)
      db.insert(schema.customers).values({
        id: 'cust-a', name: 'ACME Corp', assignedTo: 'rep-1', segment: 'A', status: 'active',
      }).run()

      db.insert(schema.callLogs).values({
        id: 'cl-script', customerId: 'cust-a', salesRepId: 'rep-1',
        contactName: 'Alice', contactPosition: 'CEO',
        callDate: '2026-08-10', callTime: '10:30',
        leadLevel: 'hot', customerNeeds: 'ต้องการรถใหม่ 3 คัน',
        interestedModels: ['กระบะ 4 ประตู (Cab4 / Hi-Lander)'],
        nextActions: ['โทรติดตามอีกครั้ง', 'ส่งใบเสนอราคา'],
        nextActionOwner: 'rep-1', nextActionDate: '2026-08-15',
        nextActionDetails: 'ส่งใบเสนอราคา กระบะ 4 ประตู จำนวน 3 คัน',
        businessOpportunities: ['ขายรถใหม่'],
      }).run()
    })

    it('returns opening and closing script', async () => {
      const res = await app.request('/api/call-logs/cl-script/script', {
        headers: authHeaders(managerToken),
      }, authEnv(db))

      expect(res.status).toBe(200)
      const body = await res.json() as any
      expect(body.success).toBe(true)
      expect(body.data).toHaveProperty('opening')
      expect(body.data).toHaveProperty('closing')
      expect(typeof body.data.opening).toBe('string')
      expect(typeof body.data.closing).toBe('string')
      expect(body.data.opening.length).toBeGreaterThan(0)
      expect(body.data.closing.length).toBeGreaterThan(0)
    })

    it('includes contact name in opening script', async () => {
      const res = await app.request('/api/call-logs/cl-script/script', {
        headers: authHeaders(managerToken),
      }, authEnv(db))

      const body = await res.json() as any
      expect(body.data.opening).toContain('Alice')
    })

    it('includes next actions in closing script', async () => {
      const res = await app.request('/api/call-logs/cl-script/script', {
        headers: authHeaders(managerToken),
      }, authEnv(db))

      const body = await res.json() as any
      expect(body.data.closing).toContain('โทรติดตามอีกครั้ง')
    })

    it('returns 404 for non-existent call log', async () => {
      const res = await app.request('/api/call-logs/non-existent/script', {
        headers: authHeaders(managerToken),
      }, authEnv(db))

      expect(res.status).toBe(404)
    })

    it('generates script for call with minimal data', async () => {
      db.insert(schema.callLogs).values({
        id: 'cl-minimal', customerId: 'cust-a', salesRepId: 'rep-1',
        contactName: 'Bob', callDate: '2026-08-10', nextActions: ['โทรติดตามอีกครั้ง'],
      }).run()

      const res = await app.request('/api/call-logs/cl-minimal/script', {
        headers: authHeaders(managerToken),
      }, authEnv(db))

      expect(res.status).toBe(200)
      const body = await res.json() as any
      expect(body.data).toHaveProperty('opening')
      expect(body.data).toHaveProperty('closing')
      expect(body.data.opening).toContain('Bob')
    })
  })
})
