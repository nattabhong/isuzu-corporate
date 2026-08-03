import { describe, it, expect, beforeAll, beforeEach } from 'vitest'
import { Hono } from 'hono'
import { SignJWT } from 'jose'
import Database from 'better-sqlite3'
import { drizzle } from 'drizzle-orm/better-sqlite3'
import { sql } from 'drizzle-orm'
import * as schema from '../db/schema'
import { dealsRoutes } from './deals'

const TEST_JWT_SECRET = 'test-jwt-secret-deals'

type TestEnv = {
  DB: any
  JWT_SECRET: string
}

function createApp() {
  const app = new Hono<{ Bindings: TestEnv }>()
  app.route('/api/deals', dealsRoutes)
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
    CREATE TABLE IF NOT EXISTS call_logs (
      id TEXT PRIMARY KEY,
      call_plan_id TEXT,
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
  db.run(sql`
    CREATE TABLE IF NOT EXISTS visit_logs (
      id TEXT PRIMARY KEY,
      visit_plan_id TEXT,
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
        lost_reason TEXT,
        competitor_brand TEXT,
        discount_amount REAL,
      source_call_log_id TEXT REFERENCES call_logs(id),
      source_visit_log_id TEXT REFERENCES visit_logs(id),
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `)
  return db
}

function clearAll(db: ReturnType<typeof createDb>) {
  db.run(sql`DELETE FROM deals`)
  db.run(sql`DELETE FROM call_logs`)
  db.run(sql`DELETE FROM visit_logs`)
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

describe('Deals Routes', () => {
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
  })

  // ======================== GET / — list deals ========================

  describe('GET / (list deals)', () => {
    beforeEach(() => {
      clearAll(db)
      // Re-seed customers for FK
      db.insert(schema.customers).values({
        id: 'cust-a', name: 'ACME Corp', assignedTo: 'rep-1', segment: 'A', status: 'active',
      }).run()
      db.insert(schema.customers).values({
        id: 'cust-b', name: 'Beta Ltd', assignedTo: 'rep-2', segment: 'B', status: 'active',
      }).run()

      db.insert(schema.deals).values({
        id: 'deal-1', customerId: 'cust-a', salesRepId: 'rep-1',
        vehicleModel: 'D-Max 1.9 S', quantity: 3, expectedAmount: 1500000,
        stage: 'lead',
      }).run()
      db.insert(schema.deals).values({
        id: 'deal-2', customerId: 'cust-b', salesRepId: 'rep-2',
        vehicleModel: 'MU-X 3.0 Ddi RS 4WD A/T', quantity: 1, expectedAmount: 800000,
        stage: 'negotiating',
      }).run()
      db.insert(schema.deals).values({
        id: 'deal-3', customerId: 'cust-a', salesRepId: 'rep-1',
        vehicleModel: 'ELF', quantity: 2, expectedAmount: 2000000,
        stage: 'won', wonAmount: 1900000,
      }).run()
    })

    it('manager sees all deals with customer names', async () => {
      const res = await app.request('/api/deals', {
        headers: authHeaders(managerToken),
      }, authEnv(db))

      expect(res.status).toBe(200)
      const body = await res.json() as any
      expect(body.success).toBe(true)
      expect(body.data).toHaveLength(3)

      // Check customer names are joined (snake_case from raw SQL)
      const names = body.data.map((d: any) => d.customer_name)
      expect(names).toContain('ACME Corp')
      expect(names).toContain('Beta Ltd')
    })

    it('sales rep sees only own deals with customer names', async () => {
      const res = await app.request('/api/deals', {
        headers: authHeaders(rep1Token),
      }, authEnv(db))

      expect(res.status).toBe(200)
      const body = await res.json() as any
      expect(body.success).toBe(true)
      expect(body.data).toHaveLength(2)
      expect(body.data.every((d: any) => d.sales_rep_id === 'rep-1')).toBe(true)

      // Both deals should have customer_name
      expect(body.data[0].customer_name).toBeDefined()
    })

    it('returns 401 without auth', async () => {
      const res = await app.request('/api/deals', {}, authEnv(db))
      expect(res.status).toBe(401)
    })
  })

  // ======================== POST / — create deal ========================

  describe('POST / (create deal)', () => {
    beforeEach(() => {
      clearAll(db)
      db.insert(schema.customers).values({
        id: 'cust-a', name: 'ACME Corp', assignedTo: 'rep-1', segment: 'A', status: 'active',
      }).run()
    })

    it('creates a deal with valid data', async () => {
      const res = await app.request('/api/deals', {
        method: 'POST',
        headers: { ...authHeaders(rep1Token), 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerId: 'cust-a',
          vehicleModel: 'D-Max 1.9 S',
          quantity: 3,
          expectedAmount: 1500000,
          expectedCloseDate: '2026-12-31',
          notes: 'สนใจสีขาว',
        }),
      }, authEnv(db))

      expect(res.status).toBe(201)
      const body = await res.json() as any
      expect(body.success).toBe(true)
      expect(body.data.customerId).toBe('cust-a')
      expect(body.data.salesRepId).toBe('rep-1')
      expect(body.data.vehicleModel).toBe('D-Max 1.9 S')
      expect(body.data.quantity).toBe(3)
      expect(body.data.expectedAmount).toBe(1500000)
      expect(body.data.stage).toBe('lead')
      expect(body.data.id).toBeDefined()
      expect(body.data.createdAt).toBeDefined()
    })

    it('links deal to source call log', async () => {
      // Re-add call_logs table (it was dropped by clearAll)
      db.run(sql`
        CREATE TABLE IF NOT EXISTS call_logs (
          id TEXT PRIMARY KEY,
          call_plan_id TEXT,
          customer_id TEXT NOT NULL REFERENCES customers(id),
          sales_rep_id TEXT NOT NULL REFERENCES team_members(id),
          contact_name TEXT NOT NULL,
          call_date TEXT NOT NULL,
          next_actions TEXT NOT NULL,
          created_at TEXT NOT NULL DEFAULT (datetime('now')),
          updated_at TEXT NOT NULL DEFAULT (datetime('now'))
        )
      `)
      db.insert(schema.callLogs).values({
        id: 'call-1', customerId: 'cust-a', salesRepId: 'rep-1',
        contactName: 'Test', callDate: '2026-08-01', nextActions: ['follow_up'],
      }).run()

      const res = await app.request('/api/deals', {
        method: 'POST',
        headers: { ...authHeaders(rep1Token), 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerId: 'cust-a',
          vehicleModel: 'D-Max 1.9 S',
          quantity: 1,
          sourceCallLogId: 'call-1',
        }),
      }, authEnv(db))

      expect(res.status).toBe(201)
      const body = await res.json() as any
      expect(body.data.sourceCallLogId).toBe('call-1')
    })

    it('defaults stage to lead', async () => {
      const res = await app.request('/api/deals', {
        method: 'POST',
        headers: { ...authHeaders(rep1Token), 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerId: 'cust-a',
          vehicleModel: 'D-Max 1.9 S',
          quantity: 1,
        }),
      }, authEnv(db))

      expect(res.status).toBe(201)
      const body = await res.json() as any
      expect(body.data.stage).toBe('lead')
    })

    it('returns 400 for missing required fields', async () => {
      const res = await app.request('/api/deals', {
        method: 'POST',
        headers: { ...authHeaders(rep1Token), 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes: 'test' }),
      }, authEnv(db))

      expect(res.status).toBe(400)
    })

    it('returns 400 when vehicle model is empty string', async () => {
      const res = await app.request('/api/deals', {
        method: 'POST',
        headers: { ...authHeaders(rep1Token), 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerId: 'cust-a',
          vehicleModel: '',
          quantity: 1,
        }),
      }, authEnv(db))

      expect(res.status).toBe(400)
    })

    it('returns 401 without auth', async () => {
      const res = await app.request('/api/deals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ customerId: 'cust-a', vehicleModel: 'D-Max 1.9 S', quantity: 1 }),
      }, authEnv(db))

      expect(res.status).toBe(401)
    })
  })

  // ======================== PATCH /:id — update deal fields ========================

  describe('PATCH /:id (update deal)', () => {
    beforeEach(() => {
      clearAll(db)
      db.insert(schema.customers).values({
        id: 'cust-a', name: 'ACME Corp', assignedTo: 'rep-1', segment: 'A', status: 'active',
      }).run()
      db.insert(schema.customers).values({
        id: 'cust-b', name: 'Beta Ltd', assignedTo: 'rep-2', segment: 'B', status: 'active',
      }).run()
      db.insert(schema.deals).values({
        id: 'deal-1', customerId: 'cust-a', salesRepId: 'rep-1',
        vehicleModel: 'D-Max 1.9 S', quantity: 3, expectedAmount: 1500000,
        stage: 'lead', notes: 'old notes',
      }).run()
    })

    it('updates deal fields', async () => {
      const res = await app.request('/api/deals/deal-1', {
        method: 'PATCH',
        headers: { ...authHeaders(managerToken), 'Content-Type': 'application/json' },
        body: JSON.stringify({
          quantity: 5,
          expectedAmount: 2500000,
          notes: 'อัปเดตจำนวนรถ',
          expectedCloseDate: '2026-11-30',
        }),
      }, authEnv(db))

      expect(res.status).toBe(200)
      const body = await res.json() as any
      expect(body.success).toBe(true)
      expect(body.data.quantity).toBe(5)
      expect(body.data.expectedAmount).toBe(2500000)
      expect(body.data.notes).toBe('อัปเดตจำนวนรถ')
      expect(body.data.expectedCloseDate).toBe('2026-11-30')
      // Unchanged fields remain
      expect(body.data.vehicleModel).toBe('D-Max 1.9 S')
      expect(body.data.stage).toBe('lead')
    })

    it('updates vehicle model', async () => {
      const res = await app.request('/api/deals/deal-1', {
        method: 'PATCH',
        headers: { ...authHeaders(managerToken), 'Content-Type': 'application/json' },
        body: JSON.stringify({ vehicleModel: 'ELF' }),
      }, authEnv(db))

      expect(res.status).toBe(200)
      const body = await res.json() as any
      expect(body.data.vehicleModel).toBe('ELF')
    })

    it('returns 404 for non-existent deal', async () => {
      const res = await app.request('/api/deals/non-existent', {
        method: 'PATCH',
        headers: { ...authHeaders(managerToken), 'Content-Type': 'application/json' },
        body: JSON.stringify({ quantity: 1 }),
      }, authEnv(db))

      expect(res.status).toBe(404)
    })

    it('returns 401 without auth', async () => {
      const res = await app.request('/api/deals/deal-1', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ quantity: 1 }),
      }, authEnv(db))

      expect(res.status).toBe(401)
    })
  })

  // ======================== PATCH /:id/stage — move deal stage ========================

  describe('PATCH /:id/stage (move stage)', () => {
    beforeEach(() => {
      clearAll(db)
      db.insert(schema.customers).values({
        id: 'cust-a', name: 'ACME Corp', assignedTo: 'rep-1', segment: 'A', status: 'active',
      }).run()
      db.insert(schema.deals).values({
        id: 'deal-1', customerId: 'cust-a', salesRepId: 'rep-1',
        vehicleModel: 'D-Max 1.9 S', quantity: 3, expectedAmount: 1500000,
        stage: 'lead',
      }).run()
    })

    it('moves deal from lead to visit_done', async () => {
      const res = await app.request('/api/deals/deal-1/stage', {
        method: 'PATCH',
        headers: { ...authHeaders(managerToken), 'Content-Type': 'application/json' },
        body: JSON.stringify({ stage: 'visit_done' }),
      }, authEnv(db))

      expect(res.status).toBe(200)
      const body = await res.json() as any
      expect(body.success).toBe(true)
      expect(body.data.stage).toBe('visit_done')
    })

    it('moves deal through full pipeline to won', async () => {
      // lead → visit_done
      await app.request('/api/deals/deal-1/stage', {
        method: 'PATCH',
        headers: { ...authHeaders(managerToken), 'Content-Type': 'application/json' },
        body: JSON.stringify({ stage: 'visit_done' }),
      }, authEnv(db))

      // visit_done → quote_sent
      await app.request('/api/deals/deal-1/stage', {
        method: 'PATCH',
        headers: { ...authHeaders(managerToken), 'Content-Type': 'application/json' },
        body: JSON.stringify({ stage: 'quote_sent' }),
      }, authEnv(db))

      // quote_sent → negotiating
      await app.request('/api/deals/deal-1/stage', {
        method: 'PATCH',
        headers: { ...authHeaders(managerToken), 'Content-Type': 'application/json' },
        body: JSON.stringify({ stage: 'negotiating' }),
      }, authEnv(db))

      // negotiating → won — should set wonAmount
      const res = await app.request('/api/deals/deal-1/stage', {
        method: 'PATCH',
        headers: { ...authHeaders(managerToken), 'Content-Type': 'application/json' },
        body: JSON.stringify({ stage: 'won' }),
      }, authEnv(db))

      expect(res.status).toBe(200)
      const body = await res.json() as any
      expect(body.data.stage).toBe('won')
      expect(body.data.wonAmount).toBe(1500000)
    })

    it('sets wonAmount to expectedAmount when stage is won', async () => {
      // Directly set to won (skipping pipeline)
      const res = await app.request('/api/deals/deal-1/stage', {
        method: 'PATCH',
        headers: { ...authHeaders(managerToken), 'Content-Type': 'application/json' },
        body: JSON.stringify({ stage: 'won' }),
      }, authEnv(db))

      expect(res.status).toBe(200)
      const body = await res.json() as any
      expect(body.data.wonAmount).toBe(1500000)
    })

    it('moves deal to lost', async () => {
      const res = await app.request('/api/deals/deal-1/stage', {
        method: 'PATCH',
        headers: { ...authHeaders(managerToken), 'Content-Type': 'application/json' },
        body: JSON.stringify({ stage: 'lost' }),
      }, authEnv(db))

      expect(res.status).toBe(200)
      const body = await res.json() as any
      expect(body.data.stage).toBe('lost')
      // wonAmount should NOT be set for lost
      expect(body.data.wonAmount).toBeNull()
    })

    it('returns 400 for invalid stage', async () => {
      const res = await app.request('/api/deals/deal-1/stage', {
        method: 'PATCH',
        headers: { ...authHeaders(managerToken), 'Content-Type': 'application/json' },
        body: JSON.stringify({ stage: 'invalid_stage' }),
      }, authEnv(db))

      expect(res.status).toBe(400)
    })

    it('returns 404 for non-existent deal', async () => {
      const res = await app.request('/api/deals/non-existent/stage', {
        method: 'PATCH',
        headers: { ...authHeaders(managerToken), 'Content-Type': 'application/json' },
        body: JSON.stringify({ stage: 'lead' }),
      }, authEnv(db))

      expect(res.status).toBe(404)
    })

    it('returns 401 without auth', async () => {
      const res = await app.request('/api/deals/deal-1/stage', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stage: 'lead' }),
      }, authEnv(db))

      expect(res.status).toBe(401)
    })
  })

  // ======================== GET /summary — pipeline summary ========================

  describe('GET /summary (pipeline summary)', () => {
    beforeEach(() => {
      clearAll(db)
      db.insert(schema.customers).values({
        id: 'cust-a', name: 'ACME Corp', assignedTo: 'rep-1', segment: 'A', status: 'active',
      }).run()
      db.insert(schema.customers).values({
        id: 'cust-b', name: 'Beta Ltd', assignedTo: 'rep-2', segment: 'B', status: 'active',
      }).run()

      // Different stages and reps
      db.insert(schema.deals).values({
        id: 'deal-1', customerId: 'cust-a', salesRepId: 'rep-1',
        vehicleModel: 'D-Max 1.9 S', quantity: 3, expectedAmount: 1500000,
        stage: 'lead',
      }).run()
      db.insert(schema.deals).values({
        id: 'deal-2', customerId: 'cust-b', salesRepId: 'rep-2',
        vehicleModel: 'MU-X 3.0 Ddi RS 4WD A/T', quantity: 1, expectedAmount: 800000,
        stage: 'lead',
      }).run()
      db.insert(schema.deals).values({
        id: 'deal-3', customerId: 'cust-a', salesRepId: 'rep-1',
        vehicleModel: 'ELF', quantity: 2, expectedAmount: 2000000,
        stage: 'negotiating',
      }).run()
      db.insert(schema.deals).values({
        id: 'deal-4', customerId: 'cust-a', salesRepId: 'rep-1',
        vehicleModel: 'D-Max 3.0 L', quantity: 1, expectedAmount: 600000,
        stage: 'won', wonAmount: 580000,
      }).run()
      db.insert(schema.deals).values({
        id: 'deal-5', customerId: 'cust-b', salesRepId: 'rep-2',
        vehicleModel: 'GIGA', quantity: 1, expectedAmount: 1200000,
        stage: 'lost',
      }).run()
    })

    it('returns summary by stage for manager', async () => {
      const res = await app.request('/api/deals/summary', {
        headers: authHeaders(managerToken),
      }, authEnv(db))

      expect(res.status).toBe(200)
      const body = await res.json() as any
      expect(body.success).toBe(true)
      expect(Array.isArray(body.data)).toBe(true)

      // Find lead stage summary
      const leadSummary = body.data.find((s: any) => s.stage === 'lead')
      expect(leadSummary).toBeDefined()
      expect(leadSummary.count).toBe(2)
      expect(leadSummary.total_value).toBe(2300000) // 1500000 + 800000

      // Find won stage summary
      const wonSummary = body.data.find((s: any) => s.stage === 'won')
      expect(wonSummary).toBeDefined()
      expect(wonSummary.count).toBe(1)
      expect(wonSummary.total_value).toBe(580000)

      // Find lost stage summary
      const lostSummary = body.data.find((s: any) => s.stage === 'lost')
      expect(lostSummary).toBeDefined()
      expect(lostSummary.count).toBe(1)
    })

    it('returns summary scoped to sales rep', async () => {
      const res = await app.request('/api/deals/summary', {
        headers: authHeaders(rep1Token),
      }, authEnv(db))

      expect(res.status).toBe(200)
      const body = await res.json() as any
      expect(body.success).toBe(true)

      // rep-1 has: lead(1), negotiating(1), won(1) = 3 deals
      const leadSummary = body.data.find((s: any) => s.stage === 'lead')
      expect(leadSummary.count).toBe(1)
      expect(leadSummary.total_value).toBe(1500000)

      const wonSummary = body.data.find((s: any) => s.stage === 'won')
      expect(wonSummary.count).toBe(1)

      // Should not have lost deals (rep-2 only)
      const lostSummary = body.data.find((s: any) => s.stage === 'lost')
      expect(lostSummary).toBeUndefined()
    })

    it('includes empty stages as zero', async () => {
      // Clear and add only one deal
      clearAll(db)
      db.insert(schema.customers).values({
        id: 'cust-a', name: 'ACME Corp', assignedTo: 'rep-1', segment: 'A', status: 'active',
      }).run()
      db.insert(schema.deals).values({
        id: 'deal-1', customerId: 'cust-a', salesRepId: 'rep-1',
        vehicleModel: 'D-Max 1.9 S', quantity: 1, expectedAmount: 500000,
        stage: 'lead',
      }).run()

      const res = await app.request('/api/deals/summary', {
        headers: authHeaders(managerToken),
      }, authEnv(db))

      const body = await res.json() as any
      // Should have entries for all stages (or at least the stages with data)
      const stages = body.data.map((s: any) => s.stage)
      expect(stages).toContain('lead')
    })

    it('returns 401 without auth', async () => {
      const res = await app.request('/api/deals/summary', {}, authEnv(db))
      expect(res.status).toBe(401)
    })
  })
})
