import { describe, it, expect, beforeAll, beforeEach } from 'vitest'
import { Hono } from 'hono'
import { SignJWT } from 'jose'
import Database from 'better-sqlite3'
import { drizzle } from 'drizzle-orm/better-sqlite3'
import { sql } from 'drizzle-orm'
import * as schema from '../db/schema'
import { customersRoutes } from './customers'

const TEST_JWT_SECRET = 'test-jwt-secret-customers'

type TestEnv = {
  DB: any
  JWT_SECRET: string
}

function createApp() {
  const app = new Hono<{ Bindings: TestEnv }>()
  app.route('/api/customers', customersRoutes)
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
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `)
  db.run(sql`
    CREATE TABLE IF NOT EXISTS customer_contacts (
      id TEXT PRIMARY KEY,
      customer_id TEXT NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      position TEXT,
      phone TEXT,
      email TEXT,
      line_id TEXT,
      is_decision_maker INTEGER NOT NULL DEFAULT 0,
      is_primary INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
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
      next_step TEXT,
      customer_mood TEXT,
      attachments TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
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
      source_call_log_id TEXT,
      source_visit_log_id TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `)
  return db
}

// Helper to clear all data in correct FK order
function clearAll(db: ReturnType<typeof createDb>) {
  db.run(sql`DELETE FROM deals`)
  db.run(sql`DELETE FROM call_logs`)
  db.run(sql`DELETE FROM visit_logs`)
  db.run(sql`DELETE FROM customer_contacts`)
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

describe('Customer Routes', () => {
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
  })

  describe('POST / (create customer)', () => {
    it('creates a customer successfully with valid data', async () => {
      const res = await app.request('/api/customers', {
        method: 'POST',
        headers: { ...authHeaders(managerToken), 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'ACME Corp', segment: 'A', province: 'Bangkok' }),
      }, authEnv(db))

      expect(res.status).toBe(201)
      const body = await res.json() as any
      expect(body.success).toBe(true)
      expect(body.data.name).toBe('ACME Corp')
      expect(body.data.segment).toBe('A')
      expect(body.data.status).toBe('active')
      expect(body.data.id).toBeDefined()
    })

    it('returns 400 when name is missing', async () => {
      const res = await app.request('/api/customers', {
        method: 'POST',
        headers: { ...authHeaders(managerToken), 'Content-Type': 'application/json' },
        body: JSON.stringify({ segment: 'B' }),
      }, authEnv(db))

      expect(res.status).toBe(400)
      const body = await res.json() as any
      expect(body.success).toBe(false)
    })

    it('returns 401 without auth token', async () => {
      const res = await app.request('/api/customers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Test' }),
      }, authEnv(db))

      expect(res.status).toBe(401)
    })
  })

  describe('GET / (list customers)', () => {
    beforeEach(() => {
      clearAll(db)
      db.insert(schema.customers).values({
        id: 'cust-a', name: 'Customer A', assignedTo: 'rep-1', segment: 'A', status: 'active',
      }).run()
      db.insert(schema.customers).values({
        id: 'cust-b', name: 'Customer B', assignedTo: 'rep-2', segment: 'B', status: 'active',
      }).run()
      db.insert(schema.customers).values({
        id: 'cust-c', name: 'Customer C', assignedTo: null, segment: 'C', status: 'inactive',
      }).run()
    })

    it('manager sees all customers', async () => {
      const res = await app.request('/api/customers', {
        headers: authHeaders(managerToken),
      }, authEnv(db))

      expect(res.status).toBe(200)
      const body = await res.json() as any
      expect(body.success).toBe(true)
      expect(body.data).toHaveLength(3)
    })

    it('sales_rep sees only assigned customers', async () => {
      const res = await app.request('/api/customers', {
        headers: authHeaders(rep1Token),
      }, authEnv(db))

      expect(res.status).toBe(200)
      const body = await res.json() as any
      expect(body.success).toBe(true)
      expect(body.data).toHaveLength(1)
      expect(body.data[0].id).toBe('cust-a')
    })
  })

  describe('GET /:id (customer detail)', () => {
    beforeEach(() => {
      clearAll(db)

      db.insert(schema.customers).values({
        id: 'cust-detail', name: 'Detail Corp', assignedTo: 'rep-1', segment: 'A',
        province: 'Chiang Mai', status: 'active',
      }).run()

      // Add contacts
      db.insert(schema.customerContacts).values({
        id: 'contact-1', customerId: 'cust-detail', name: 'Alice', position: 'CEO',
        isDecisionMaker: true, isPrimary: true,
      }).run()
      db.insert(schema.customerContacts).values({
        id: 'contact-2', customerId: 'cust-detail', name: 'Bob', position: 'Manager',
      }).run()

      // Add visit logs
      db.insert(schema.visitLogs).values({
        id: 'vlog-1', customerId: 'cust-detail', salesRepId: 'rep-1',
        visitDate: '2026-07-15',
      }).run()
      db.insert(schema.visitLogs).values({
        id: 'vlog-2', customerId: 'cust-detail', salesRepId: 'rep-1',
        visitDate: '2026-08-01',
      }).run()

      // Add call logs
      db.insert(schema.callLogs).values({
        id: 'clog-1', customerId: 'cust-detail', salesRepId: 'rep-1',
        contactName: 'Alice', callDate: '2026-07-20', leadLevel: 'hot',
        nextActions: ["follow_up"],
      }).run()

      // Add deals (one active, one won)
      db.insert(schema.deals).values({
        id: 'deal-1', customerId: 'cust-detail', salesRepId: 'rep-1',
        vehicleModel: 'D-Max 1.9 S', quantity: 2, stage: 'negotiating',
      }).run()
      db.insert(schema.deals).values({
        id: 'deal-2', customerId: 'cust-detail', salesRepId: 'rep-1',
        vehicleModel: 'MU-X 3.0', quantity: 1, stage: 'won',
      }).run()
    })

    it('returns customer detail with contacts and stats', async () => {
      const res = await app.request('/api/customers/cust-detail', {
        headers: authHeaders(managerToken),
      }, authEnv(db))

      expect(res.status).toBe(200)
      const body = await res.json() as any
      expect(body.success).toBe(true)
      expect(body.data.id).toBe('cust-detail')
      expect(body.data.name).toBe('Detail Corp')
      expect(body.data.contacts).toHaveLength(2)
      expect(body.data.visitStats.total).toBe(2)
      expect(body.data.visitStats.lastVisit).toBe('2026-08-01')
      expect(body.data.callStats.total).toBe(1)
      expect(body.data.callStats.lastCall).toBe('2026-07-20')
      expect(body.data.callStats.leadLevel).toBe('hot')
      expect(body.data.activeDeals).toBe(1) // Only 'negotiating' counts, not 'won'
    })

    it('returns null stats when no visits/calls/deals exist', async () => {
      // Fresh customer without any related records
      db.insert(schema.customers).values({
        id: 'cust-empty', name: 'Empty Corp', assignedTo: 'rep-1', segment: 'B',
      }).run()

      const res = await app.request('/api/customers/cust-empty', {
        headers: authHeaders(managerToken),
      }, authEnv(db))

      expect(res.status).toBe(200)
      const body = await res.json() as any
      expect(body.data.contacts).toHaveLength(0)
      expect(body.data.visitStats.total).toBe(0)
      expect(body.data.visitStats.lastVisit).toBeNull()
      expect(body.data.callStats.total).toBe(0)
      expect(body.data.callStats.lastCall).toBeNull()
      expect(body.data.callStats.leadLevel).toBeNull()
      expect(body.data.activeDeals).toBe(0)
    })

    it('returns 404 for non-existent customer', async () => {
      const res = await app.request('/api/customers/non-existent', {
        headers: authHeaders(managerToken),
      }, authEnv(db))

      expect(res.status).toBe(404)
    })
  })

  describe('PATCH /:id (update customer)', () => {
    beforeEach(() => {
      clearAll(db)
      db.insert(schema.customers).values({
        id: 'cust-update', name: 'Update Me', segment: 'C', status: 'active',
      }).run()
    })

    it('updates customer fields', async () => {
      const res = await app.request('/api/customers/cust-update', {
        method: 'PATCH',
        headers: { ...authHeaders(managerToken), 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Updated Corp', segment: 'A', province: 'Bangkok' }),
      }, authEnv(db))

      expect(res.status).toBe(200)
      const body = await res.json() as any
      expect(body.success).toBe(true)
      expect(body.data.name).toBe('Updated Corp')
      expect(body.data.segment).toBe('A')
      expect(body.data.province).toBe('Bangkok')
    })

    it('returns 404 for non-existent customer', async () => {
      const res = await app.request('/api/customers/non-existent', {
        method: 'PATCH',
        headers: { ...authHeaders(managerToken), 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Ghost' }),
      }, authEnv(db))

      expect(res.status).toBe(404)
    })
  })

  describe('DELETE /:id (soft-delete customer)', () => {
    beforeEach(() => {
      clearAll(db)
      db.insert(schema.customers).values({
        id: 'cust-del', name: 'Delete Me', status: 'active',
      }).run()
    })

    it('soft-deletes customer by setting status to inactive', async () => {
      const res = await app.request('/api/customers/cust-del', {
        method: 'DELETE',
        headers: authHeaders(managerToken),
      }, authEnv(db))

      expect(res.status).toBe(200)
      const body = await res.json() as any
      expect(body.success).toBe(true)

      // Verify status changed
      const row = db.select().from(schema.customers).where(sql`id = 'cust-del'`).get() as any
      expect(row.status).toBe('inactive')
    })

    it('returns 404 for non-existent customer', async () => {
      const res = await app.request('/api/customers/non-existent', {
        method: 'DELETE',
        headers: authHeaders(managerToken),
      }, authEnv(db))

      expect(res.status).toBe(404)
    })
  })

  describe('POST /:id/contacts (add contact)', () => {
    beforeEach(() => {
      clearAll(db)
      db.insert(schema.customers).values({
        id: 'cust-contacts', name: 'Contact Test Corp',
      }).run()
    })

    it('adds a contact to a customer', async () => {
      const res = await app.request('/api/customers/cust-contacts/contacts', {
        method: 'POST',
        headers: { ...authHeaders(managerToken), 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Charlie', position: 'CTO', phone: '0812345678',
          isDecisionMaker: true, isPrimary: true,
        }),
      }, authEnv(db))

      expect(res.status).toBe(201)
      const body = await res.json() as any
      expect(body.success).toBe(true)
      expect(body.data.name).toBe('Charlie')
      expect(body.data.position).toBe('CTO')
      expect(body.data.customerId).toBe('cust-contacts')
      expect(body.data.isDecisionMaker).toBe(true)
    })

    it('returns 400 when name is missing', async () => {
      const res = await app.request('/api/customers/cust-contacts/contacts', {
        method: 'POST',
        headers: { ...authHeaders(managerToken), 'Content-Type': 'application/json' },
        body: JSON.stringify({ position: 'CTO' }),
      }, authEnv(db))

      expect(res.status).toBe(400)
    })

    it('returns 404 for non-existent customer', async () => {
      const res = await app.request('/api/customers/non-existent/contacts', {
        method: 'POST',
        headers: { ...authHeaders(managerToken), 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Ghost' }),
      }, authEnv(db))

      expect(res.status).toBe(404)
    })
  })

  describe('PATCH /:id/contacts/:contactId (update contact)', () => {
    beforeEach(() => {
      clearAll(db)
      db.insert(schema.customers).values({
        id: 'cust-contacts-update', name: 'Contact Update Corp',
      }).run()
      db.insert(schema.customerContacts).values({
        id: 'contact-upd-1', customerId: 'cust-contacts-update',
        name: 'Dave', position: 'Manager',
      }).run()
    })

    it('updates a contact', async () => {
      const res = await app.request('/api/customers/cust-contacts-update/contacts/contact-upd-1', {
        method: 'PATCH',
        headers: { ...authHeaders(managerToken), 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'David', position: 'Senior Manager', isPrimary: true }),
      }, authEnv(db))

      expect(res.status).toBe(200)
      const body = await res.json() as any
      expect(body.success).toBe(true)
      expect(body.data.name).toBe('David')
      expect(body.data.position).toBe('Senior Manager')
      expect(body.data.isPrimary).toBe(true)
    })

    it('returns 404 for non-existent contact', async () => {
      const res = await app.request('/api/customers/cust-contacts-update/contacts/non-existent', {
        method: 'PATCH',
        headers: { ...authHeaders(managerToken), 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Ghost' }),
      }, authEnv(db))

      expect(res.status).toBe(404)
    })
  })

  describe('DELETE /:id/contacts/:contactId (remove contact)', () => {
    beforeEach(() => {
      clearAll(db)
      db.insert(schema.customers).values({
        id: 'cust-contacts-del', name: 'Contact Delete Corp',
      }).run()
      db.insert(schema.customerContacts).values({
        id: 'contact-del-1', customerId: 'cust-contacts-del', name: 'Eve',
      }).run()
    })

    it('removes a contact', async () => {
      const res = await app.request('/api/customers/cust-contacts-del/contacts/contact-del-1', {
        method: 'DELETE',
        headers: authHeaders(managerToken),
      }, authEnv(db))

      expect(res.status).toBe(200)
      const body = await res.json() as any
      expect(body.success).toBe(true)

      // Verify contact is gone
      const contacts = db.select().from(schema.customerContacts)
        .where(sql`customer_id = 'cust-contacts-del'`)
        .all()
      expect(contacts).toHaveLength(0)
    })

    it('returns 404 for non-existent contact', async () => {
      const res = await app.request('/api/customers/cust-contacts-del/contacts/non-existent', {
        method: 'DELETE',
        headers: authHeaders(managerToken),
      }, authEnv(db))

      expect(res.status).toBe(404)
    })
  })
})
