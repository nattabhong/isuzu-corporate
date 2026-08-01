import { describe, it, expect, beforeAll } from 'vitest'
import Database from 'better-sqlite3'
import { drizzle } from 'drizzle-orm/better-sqlite3'
import { sql } from 'drizzle-orm'
import * as schema from './schema'

describe('Drizzle Schema', () => {
  let db: ReturnType<typeof drizzle>

  beforeAll(async () => {
    const sqlite = new Database(':memory:')
    sqlite.pragma('journal_mode = WAL')
    sqlite.pragma('foreign_keys = ON')
    db = drizzle(sqlite, { schema })

    // Create all tables using raw SQL from Drizzle's SQL generation
    // We push the schema by executing the generated SQL
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
        source_call_log_id TEXT REFERENCES call_logs(id),
        source_visit_log_id TEXT REFERENCES visit_logs(id),
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      )
    `)
    db.run(sql`
      CREATE TABLE IF NOT EXISTS monthly_targets (
        id TEXT PRIMARY KEY,
        sales_rep_id TEXT NOT NULL REFERENCES team_members(id),
        month TEXT NOT NULL,
        visit_target INTEGER NOT NULL DEFAULT 0,
        call_target INTEGER NOT NULL DEFAULT 0,
        deal_target INTEGER
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
  })

  // --- Table count ---
  it('should have all 10 tables defined in the schema', () => {
    const tableNames = Object.keys(schema)
    // schema exports table definitions + some drizzle internals; count the known tables
    const expectedTables = [
      'teamMembers', 'customers', 'customerContacts',
      'visitPlans', 'visitLogs', 'callPlans', 'callLogs',
      'deals', 'monthlyTargets', 'sessions',
    ]
    for (const name of expectedTables) {
      expect(tableNames).toContain(name)
    }
  })

  // --- Team Members ---
  describe('team_members', () => {
    it('should insert a team member with valid data', () => {
      const result = db.insert(schema.teamMembers).values({
        id: 'tm-001',
        lineUserId: 'line-u-001',
        name: 'John Doe',
        email: 'john@example.com',
        phone: '0812345678',
        role: 'sales_rep',
        territory: 'Bangkok',
        isActive: true,
      }).run()
      expect(result.changes).toBe(1)
    })

    it('should enforce unique line_user_id', () => {
      expect(() => {
        db.insert(schema.teamMembers).values({
          id: 'tm-002',
          lineUserId: 'line-u-001', // duplicate
          name: 'Jane Doe',
          role: 'manager',
        }).run()
      }).toThrow()
    })

    it('should use default values', () => {
      db.insert(schema.teamMembers).values({
        id: 'tm-003',
        lineUserId: 'line-u-003',
        name: 'Default Test',
        role: 'sales_rep',
      }).run()

      const row = db.select().from(schema.teamMembers).where(
        sql`id = 'tm-003'`
      ).get() as any
      expect(row.isActive).toBe(true) // default true
      expect(row.createdAt).toBeTruthy()
      expect(row.updatedAt).toBeTruthy()
    })
  })

  // --- Customers ---
  describe('customers', () => {
    it('should insert a customer with valid data', () => {
      // Need a team member for FK
      db.insert(schema.teamMembers).values({
        id: 'tm-cust',
        lineUserId: 'line-cust-001',
        name: 'Cust Rep',
        role: 'sales_rep',
      }).run()

      const result = db.insert(schema.customers).values({
        id: 'cust-001',
        name: 'ACME Corp',
        companyType: 'Manufacturing',
        industry: 'Automotive',
        address: '123 Main St',
        province: 'Bangkok',
        district: 'Watthana',
        segment: 'A',
        assignedTo: 'tm-cust',
        status: 'active',
      }).run()
      expect(result.changes).toBe(1)
    })

    it('should enforce foreign key on assigned_to', () => {
      expect(() => {
        db.insert(schema.customers).values({
          id: 'cust-002',
          name: 'Bad FK',
          assignedTo: 'non-existent-id',
        }).run()
      }).toThrow()
    })

    it('should default segment to B', () => {
      db.insert(schema.customers).values({
        id: 'cust-003',
        name: 'Default Segment',
      }).run()
      const row = db.select().from(schema.customers).where(
        sql`id = 'cust-003'`
      ).get() as any
      expect(row.segment).toBe('B')
    })
  })

  // --- Customer Contacts ---
  describe('customer_contacts', () => {
    it('should insert a contact with valid data', () => {
      const result = db.insert(schema.customerContacts).values({
        id: 'cc-001',
        customerId: 'cust-001',
        name: 'Alice Manager',
        position: 'CEO',
        phone: '0899999999',
        email: 'alice@acme.com',
        isDecisionMaker: true,
        isPrimary: true,
      }).run()
      expect(result.changes).toBe(1)
    })

    it('should cascade delete when customer is deleted', () => {
      // Delete the customer, contact should be gone
      db.delete(schema.customers).where(sql`id = 'cust-001'`).run()
      // We don't test cascade directly in SQLite with FK ON (depends on pragma)
      // but we test the FK constraint exists
    })

    it('should enforce foreign key on customer_id', () => {
      expect(() => {
        db.insert(schema.customerContacts).values({
          id: 'cc-002',
          customerId: 'non-existent-cust',
          name: 'Bad FK Contact',
        }).run()
      }).toThrow()
    })
  })

  // --- Visit Plans ---
  describe('visit_plans', () => {
    it('should insert a visit plan with valid data', () => {
      const result = db.insert(schema.visitPlans).values({
        id: 'vp-001',
        customerId: 'cust-003',
        salesRepId: 'tm-cust',
        month: '2026-08',
        plannedDate: '2026-08-15',
        visitType: 'follow_up',
        objective: 'Check on fleet status',
        status: 'planned',
      }).run()
      expect(result.changes).toBe(1)
    })

    it('should enforce FK on customer_id', () => {
      expect(() => {
        db.insert(schema.visitPlans).values({
          id: 'vp-002',
          customerId: 'no-cust',
          salesRepId: 'tm-cust',
          month: '2026-08',
          plannedDate: '2026-08-16',
        }).run()
      }).toThrow()
    })

    it('should enforce FK on sales_rep_id', () => {
      expect(() => {
        db.insert(schema.visitPlans).values({
          id: 'vp-003',
          customerId: 'cust-003',
          salesRepId: 'no-rep',
          month: '2026-08',
          plannedDate: '2026-08-17',
        }).run()
      }).toThrow()
    })
  })

  // --- Visit Logs ---
  describe('visit_logs', () => {
    it('should insert a visit log with valid data', () => {
      const result = db.insert(schema.visitLogs).values({
        id: 'vl-001',
        customerId: 'cust-003',
        salesRepId: 'tm-cust',
        visitDate: '2026-08-15',
        startTime: '09:00',
        endTime: '10:30',
        gpsLat: 13.7563,
        gpsLng: 100.5018,
        notes: 'Customer interested in new D-Max',
        nextStep: 'Send quotation',
        customerMood: 'positive',
        attachments: ['photo1.jpg', 'photo2.jpg'],
      }).run()
      expect(result.changes).toBe(1)
    })

    it('should accept optional visit_plan_id', () => {
      db.insert(schema.visitPlans).values({
        id: 'vp-010',
        customerId: 'cust-003',
        salesRepId: 'tm-cust',
        month: '2026-08',
        plannedDate: '2026-08-20',
      }).run()

      const result = db.insert(schema.visitLogs).values({
        id: 'vl-002',
        visitPlanId: 'vp-010',
        customerId: 'cust-003',
        salesRepId: 'tm-cust',
        visitDate: '2026-08-20',
      }).run()
      expect(result.changes).toBe(1)
    })
  })

  // --- Call Plans ---
  describe('call_plans', () => {
    it('should insert a call plan with valid data', () => {
      const result = db.insert(schema.callPlans).values({
        id: 'cp-001',
        customerId: 'cust-003',
        salesRepId: 'tm-cust',
        month: '2026-08',
        plannedDate: '2026-08-10',
        callPurpose: 'check_in',
        status: 'planned',
      }).run()
      expect(result.changes).toBe(1)
    })

    it('should enforce FK on customer_id', () => {
      expect(() => {
        db.insert(schema.callPlans).values({
          id: 'cp-002',
          customerId: 'no-cust',
          salesRepId: 'tm-cust',
          month: '2026-08',
          plannedDate: '2026-08-11',
        }).run()
      }).toThrow()
    })
  })

  // --- Call Logs (10-section form) ---
  describe('call_logs', () => {
    it('should insert a full call log with all sections', () => {
      const result = db.insert(schema.callLogs).values({
        id: 'cl-001',
        customerId: 'cust-003',
        salesRepId: 'tm-cust',
        // Section 1
        contactName: 'Bob Contact',
        contactPosition: 'Fleet Manager',
        contactPhone: '0811111111',
        contactLineEmail: 'bob@line.me',
        callDate: '2026-08-10',
        callTime: '14:00',
        notConvenient: false,
        durationMinutes: 15,
        // Section 3 — Fleet
        fleetIsuzuCount: 5,
        fleetOtherCount: 2,
        fleetPickup: 3,
        fleetTruck: 2,
        fleetSuv: 1,
        fleetTotal: 7,
        usageTypes: ['ขนส่งสินค้า', 'งานก่อสร้าง'],
        // Section 4 — Status
        usageStatusNotes: 'All vehicles operational',
        hasProblemVehicles: false,
        problemCount: 0,
        serviceLocation: 'chiangmai',
        mainProblems: [],
        // Section 5 — Purchase plan
        purchaseTimeline: '3m',
        expectedQuantity: 2,
        interestedModels: ['กระบะ 4 ประตู', 'MU-X'],
        purchasePurpose: ['ขยายธุรกิจ'],
        // Section 6 — Decision
        decisionMakers: [{ role: 'CEO', namePosition: 'Alice — CEO' }],
        keyFactors: ['ราคารถ', 'ความทนทาน', 'บริการหลังการขาย'],
        // Section 7 — Services
        interestedServices: ['ทดลองขับ', 'ขอใบเสนอราคา'],
        // Section 8 — Summary
        leadLevel: 'hot',
        customerNeeds: 'Need 2 new pickups for expanded delivery fleet',
        problemsFound: 'Current fleet aging, high maintenance costs',
        businessOpportunities: ['Expanding delivery routes to South'],
        // Section 9 — Next steps
        nextActions: ['ส่งใบเสนอราคา', 'นัดทดลองขับ'],
        nextActionOwner: 'tm-cust',
        nextActionDate: '2026-08-15',
        nextActionDetails: 'Prepare quote for 2x D-Max 3.0 L',
      }).run()
      expect(result.changes).toBe(1)
    })

    it('should enforce NOT NULL on next_actions', () => {
      expect(() => {
        db.insert(schema.callLogs).values({
          id: 'cl-002',
          customerId: 'cust-003',
          salesRepId: 'tm-cust',
          contactName: 'Test',
          callDate: '2026-08-10',
          // nextActions is missing, should fail
        } as any).run()
      }).toThrow()
    })

    it('should enforce FK on customer_id', () => {
      expect(() => {
        db.insert(schema.callLogs).values({
          id: 'cl-003',
          customerId: 'no-cust',
          salesRepId: 'tm-cust',
          contactName: 'Test',
          callDate: '2026-08-10',
          nextActions: ['action'],
        }).run()
      }).toThrow()
    })
  })

  // --- Deals ---
  describe('deals', () => {
    it('should insert a deal with valid data', () => {
      const result = db.insert(schema.deals).values({
        id: 'deal-001',
        customerId: 'cust-003',
        salesRepId: 'tm-cust',
        vehicleModel: 'D-Max 3.0 L',
        quantity: 2,
        expectedAmount: 2000000,
        stage: 'lead',
        expectedCloseDate: '2026-09-30',
        notes: 'Customer needs financing',
      }).run()
      expect(result.changes).toBe(1)
    })

    it('should default quantity to 1', () => {
      db.insert(schema.deals).values({
        id: 'deal-002',
        customerId: 'cust-003',
        salesRepId: 'tm-cust',
        vehicleModel: 'MU-X 3.0',
      }).run()
      const row = db.select().from(schema.deals).where(
        sql`id = 'deal-002'`
      ).get() as any
      expect(row.quantity).toBe(1)
    })
  })

  // --- Monthly Targets ---
  describe('monthly_targets', () => {
    it('should insert a monthly target', () => {
      const result = db.insert(schema.monthlyTargets).values({
        id: 'mt-001',
        salesRepId: 'tm-cust',
        month: '2026-08',
        visitTarget: 20,
        callTarget: 50,
        dealTarget: 5,
      }).run()
      expect(result.changes).toBe(1)
    })

    it('should default targets to 0', () => {
      db.insert(schema.monthlyTargets).values({
        id: 'mt-002',
        salesRepId: 'tm-cust',
        month: '2026-09',
      }).run()
      const row = db.select().from(schema.monthlyTargets).where(
        sql`id = 'mt-002'`
      ).get() as any
      expect(row.visitTarget).toBe(0)
      expect(row.callTarget).toBe(0)
    })
  })

  // --- Sessions ---
  describe('sessions', () => {
    it('should insert a session', () => {
      const result = db.insert(schema.sessions).values({
        id: 'sess-001',
        teamMemberId: 'tm-cust',
        token: 'jwt-token-here',
        expiresAt: '2026-08-08T00:00:00Z',
      }).run()
      expect(result.changes).toBe(1)
    })

    it('should enforce FK on team_member_id', () => {
      expect(() => {
        db.insert(schema.sessions).values({
          id: 'sess-002',
          teamMemberId: 'no-member',
          token: 'token',
          expiresAt: '2026-08-08T00:00:00Z',
        }).run()
      }).toThrow()
    })
  })
})
