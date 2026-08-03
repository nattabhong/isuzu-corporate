import { Hono } from 'hono'
import { eq, and, sql as drizzleSql, notInArray, count, max } from 'drizzle-orm'
import { createDb } from '../db'
import { customers, customerContacts, visitLogs, callLogs, deals } from '../db/schema'
import { authMiddleware } from '../middleware/auth'
import type { AuthUser } from '../middleware/auth'
import {
  createCustomerSchema,
  updateCustomerSchema,
  createContactSchema,
  updateContactSchema,
} from '@sala-corporate/shared'
import type { DbClient } from '../db'

type Env = {
  DB: D1Database | DbClient
  JWT_SECRET: string
}

function resolveDb(env: Env): DbClient {
  const db = env.DB
  if (db && typeof db === 'object' && 'insert' in db) {
    return db as unknown as DbClient
  }
  return createDb(db as D1Database)
}

// Protected sub-app with auth middleware
const api = new Hono<{ Bindings: { JWT_SECRET: string; DB: any }; Variables: { user: AuthUser } }>()
api.use('*', authMiddleware)

// GET / — list customers
api.get('/', async (c) => {
  const db = resolveDb(c.env)
  const user = c.var.user

  if (user.role === 'manager') {
    const result = await db.select().from(customers).all()
    return c.json({ success: true, data: result })
  }

  const result = await db.select().from(customers)
    .where(eq(customers.assignedTo, user.id))
    .all()
  return c.json({ success: true, data: result })
})

// GET /:id — customer detail with contacts + stats
api.get('/:id', async (c) => {
  const db = resolveDb(c.env)
  const id = c.req.param('id')

  const customer = await db.select().from(customers)
    .where(eq(customers.id, id))
    .get()

  if (!customer) {
    return c.json({ success: false, error: 'ไม่พบลูกค้า' }, 404)
  }

  const contacts = await db.select().from(customerContacts)
    .where(eq(customerContacts.customerId, id))
    .all()

  const visitCount = db.select({ count: count() }).from(visitLogs)
    .where(eq(visitLogs.customerId, id))
  const lastVisit = db.select({ lastVisit: max(visitLogs.visitDate) }).from(visitLogs)
    .where(eq(visitLogs.customerId, id))

  const callCount = db.select({ count: count() }).from(callLogs)
    .where(eq(callLogs.customerId, id))
  const lastCall = db.select({ lastCall: max(callLogs.callDate) }).from(callLogs)
    .where(eq(callLogs.customerId, id))
  const latestLeadLevel = db.select({ leadLevel: callLogs.leadLevel })
    .from(callLogs)
    .where(and(eq(callLogs.customerId, id), drizzleSql`${callLogs.leadLevel} IS NOT NULL`))
    .orderBy(drizzleSql`${callLogs.callDate} DESC`)
    .limit(1)

  const activeDealsCount = db.select({ count: count() }).from(deals)
    .where(and(
      eq(deals.customerId, id),
      notInArray(deals.stage, ['won', 'lost']),
    ))

  const [
    visitCountResult,
    lastVisitResult,
    callCountResult,
    lastCallResult,
    latestLeadLevelResult,
    activeDealsCountResult,
  ] = await Promise.all([
    visitCount,
    lastVisit,
    callCount,
    lastCall,
    latestLeadLevel,
    activeDealsCount,
  ])

  const detail = {
    ...customer,
    contacts,
    visitStats: {
      total: visitCountResult[0]?.count ?? 0,
      lastVisit: lastVisitResult[0]?.lastVisit ?? null,
    },
    callStats: {
      total: callCountResult[0]?.count ?? 0,
      lastCall: lastCallResult[0]?.lastCall ?? null,
      leadLevel: latestLeadLevelResult[0]?.leadLevel ?? null,
    },
    activeDeals: activeDealsCountResult[0]?.count ?? 0,
  }

  return c.json({ success: true, data: detail })
})

// POST / — create customer
api.post('/', async (c) => {
  const db = resolveDb(c.env)
  const body = await c.req.json()
  const parsed = createCustomerSchema.safeParse(body)

  if (!parsed.success) {
    return c.json({ success: false, error: parsed.error.issues[0].message }, 400)
  }

  const id = crypto.randomUUID()
  const now = new Date().toISOString()

  await db.insert(customers).values({
    id,
    ...parsed.data,
    status: 'active',
    createdAt: now,
    updatedAt: now,
  })

  const customer = await db.select().from(customers)
    .where(eq(customers.id, id))
    .get()

  return c.json({ success: true, data: customer }, 201)
})

// PATCH /:id — update customer
api.patch('/:id', async (c) => {
  const db = resolveDb(c.env)
  const id = c.req.param('id')
  const body = await c.req.json()
  const parsed = updateCustomerSchema.safeParse(body)

  if (!parsed.success) {
    return c.json({ success: false, error: parsed.error.issues[0].message }, 400)
  }

  const existing = await db.select().from(customers)
    .where(eq(customers.id, id))
    .get()

  if (!existing) {
    return c.json({ success: false, error: 'ไม่พบลูกค้า' }, 404)
  }

  await db.update(customers)
    .set({ ...parsed.data, updatedAt: new Date().toISOString() })
    .where(eq(customers.id, id))

  const updated = await db.select().from(customers)
    .where(eq(customers.id, id))
    .get()

  return c.json({ success: true, data: updated })
})

// DELETE /:id — soft-delete
api.delete('/:id', async (c) => {
  const db = resolveDb(c.env)
  const id = c.req.param('id')

  const existing = await db.select().from(customers)
    .where(eq(customers.id, id))
    .get()

  if (!existing) {
    return c.json({ success: false, error: 'ไม่พบลูกค้า' }, 404)
  }

  await db.update(customers)
    .set({ status: 'inactive', updatedAt: new Date().toISOString() })
    .where(eq(customers.id, id))

  return c.json({ success: true })
})

// POST /:id/contacts — add contact
api.post('/:id/contacts', async (c) => {
  const db = resolveDb(c.env)
  const customerId = c.req.param('id')

  const customer = await db.select().from(customers)
    .where(eq(customers.id, customerId))
    .get()

  if (!customer) {
    return c.json({ success: false, error: 'ไม่พบลูกค้า' }, 404)
  }

  const body = await c.req.json()
  const parsed = createContactSchema.safeParse({ ...body, customerId })

  if (!parsed.success) {
    return c.json({ success: false, error: parsed.error.issues[0].message }, 400)
  }

  const id = crypto.randomUUID()

  await db.insert(customerContacts).values({
    id,
    customerId,
    name: parsed.data.name,
    position: parsed.data.position ?? null,
    phone: parsed.data.phone ?? null,
    email: parsed.data.email || null,
    lineId: parsed.data.lineId ?? null,
    isDecisionMaker: parsed.data.isDecisionMaker ?? false,
    isPrimary: parsed.data.isPrimary ?? false,
  })

  const contact = await db.select().from(customerContacts)
    .where(eq(customerContacts.id, id))
    .get()

  return c.json({ success: true, data: contact }, 201)
})

// PATCH /:id/contacts/:contactId — update contact
api.patch('/:id/contacts/:contactId', async (c) => {
  const db = resolveDb(c.env)
  const customerId = c.req.param('id')
  const contactId = c.req.param('contactId')

  const existing = await db.select().from(customerContacts)
    .where(and(
      eq(customerContacts.id, contactId),
      eq(customerContacts.customerId, customerId),
    ))
    .get()

  if (!existing) {
    return c.json({ success: false, error: 'ไม่พบผู้ติดต่อ' }, 404)
  }

  const body = await c.req.json()
  const parsed = updateContactSchema.safeParse(body)

  if (!parsed.success) {
    return c.json({ success: false, error: parsed.error.issues[0].message }, 400)
  }

  await db.update(customerContacts)
    .set(parsed.data)
    .where(eq(customerContacts.id, contactId))

  const updated = await db.select().from(customerContacts)
    .where(eq(customerContacts.id, contactId))
    .get()

  return c.json({ success: true, data: updated })
})

// DELETE /:id/contacts/:contactId — remove contact
api.delete('/:id/contacts/:contactId', async (c) => {
  const db = resolveDb(c.env)
  const customerId = c.req.param('id')
  const contactId = c.req.param('contactId')

  const existing = await db.select().from(customerContacts)
    .where(and(
      eq(customerContacts.id, contactId),
      eq(customerContacts.customerId, customerId),
    ))
    .get()

  if (!existing) {
    return c.json({ success: false, error: 'ไม่พบผู้ติดต่อ' }, 404)
  }

  await db.delete(customerContacts)
    .where(eq(customerContacts.id, contactId))

  return c.json({ success: true })
})

// Export the api directly as customersRoutes
export { api as customersRoutes }
