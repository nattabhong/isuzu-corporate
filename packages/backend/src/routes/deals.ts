import { Hono } from 'hono'
import { eq, sql } from 'drizzle-orm'
import { createDb } from '../db'
import { deals, customers, teamMembers } from '../db/schema'
import { authMiddleware } from '../middleware/auth'
import { createDealSchema, updateDealSchema, updateDealStageSchema } from '@sala-corporate/shared'
import type { AuthUser } from '../middleware/auth'
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

export const dealsRoutes = new Hono<{
  Bindings: Env
  Variables: { user: AuthUser }
}>()

// GET /summary — must be before GET /:id to avoid route conflict
dealsRoutes.get('/summary', authMiddleware, async (c) => {
  const db = resolveDb(c.env)
  const user = c.get('user')

  const countExpr = sql<number>`COUNT(*)`
  const valueExpr = sql<number>`COALESCE(SUM(CASE WHEN ${deals.stage} = 'won' THEN ${deals.wonAmount} ELSE ${deals.expectedAmount} END), 0)`
  const orderExpr = sql`CASE ${deals.stage}
    WHEN 'lead' THEN 1
    WHEN 'visit_done' THEN 2
    WHEN 'quote_sent' THEN 3
    WHEN 'negotiating' THEN 4
    WHEN 'won' THEN 5
    WHEN 'lost' THEN 6
  END`

  const query = db.select({
    stage: deals.stage,
    count: countExpr,
    total_value: valueExpr,
  }).from(deals)
    .groupBy(deals.stage)
    .orderBy(orderExpr)

  const result = user.role === 'manager'
    ? await query
    : await query.where(eq(deals.salesRepId, user.id))

  return c.json({ success: true, data: result })
})

// GET / — list deals with customer names
dealsRoutes.get('/', authMiddleware, async (c) => {
  const db = resolveDb(c.env)
  const user = c.get('user')

  const query = db.select({
    id: deals.id,
    customer_id: deals.customerId,
    sales_rep_id: deals.salesRepId,
    vehicle_model: deals.vehicleModel,
    quantity: deals.quantity,
    expected_amount: deals.expectedAmount,
    stage: deals.stage,
    expected_close_date: deals.expectedCloseDate,
    won_amount: deals.wonAmount,
    notes: deals.notes,
    source_call_log_id: deals.sourceCallLogId,
    source_visit_log_id: deals.sourceVisitLogId,
    created_at: deals.createdAt,
    updated_at: deals.updatedAt,
    customer_name: customers.name,
    sales_rep_name: teamMembers.name,
  }).from(deals)
    .innerJoin(customers, eq(deals.customerId, customers.id))
    .innerJoin(teamMembers, eq(deals.salesRepId, teamMembers.id))
    .orderBy(sql`${deals.createdAt} DESC`)

  const result = user.role === 'manager'
    ? await query
    : await query.where(eq(deals.salesRepId, user.id))

  return c.json({ success: true, data: result })
})

// POST / — create deal
dealsRoutes.post('/', authMiddleware, async (c) => {
  const db = resolveDb(c.env)
  const user = c.get('user')
  const body = await c.req.json()
  const parsed = createDealSchema.safeParse(body)

  if (!parsed.success) {
    return c.json({ success: false, error: parsed.error.issues[0].message }, 400)
  }

  const id = crypto.randomUUID()
  const now = new Date().toISOString()

  await db.insert(deals).values({
    id,
    ...parsed.data,
    salesRepId: user.id,
    createdAt: now,
    updatedAt: now,
  })

  const deal = await db.select().from(deals).where(eq(deals.id, id)).get()
  return c.json({ success: true, data: deal }, 201)
})

// PATCH /:id — update deal fields
dealsRoutes.patch('/:id', authMiddleware, async (c) => {
  const db = resolveDb(c.env)
  const id = c.req.param('id')
  const body = await c.req.json()
  const parsed = updateDealSchema.safeParse(body)

  if (!parsed.success) {
    return c.json({ success: false, error: parsed.error.issues[0].message }, 400)
  }

  const existing = await db.select().from(deals).where(eq(deals.id, id)).get()
  if (!existing) {
    return c.json({ success: false, error: 'ไม่พบดีล' }, 404)
  }

  const updateData: Record<string, unknown> = {
    ...parsed.data,
    updatedAt: new Date().toISOString(),
  }

  await db.update(deals).set(updateData).where(eq(deals.id, id))

  const updated = await db.select().from(deals).where(eq(deals.id, id)).get()
  return c.json({ success: true, data: updated })
})

// PATCH /:id/stage — update deal stage
dealsRoutes.patch('/:id/stage', authMiddleware, async (c) => {
  const db = resolveDb(c.env)
  const id = c.req.param('id')
  const body = await c.req.json()
  const parsed = updateDealStageSchema.safeParse(body)

  if (!parsed.success) {
    return c.json({ success: false, error: parsed.error.issues[0].message }, 400)
  }

  const existing = await db.select().from(deals).where(eq(deals.id, id)).get()
  if (!existing) {
    return c.json({ success: false, error: 'ไม่พบดีล' }, 404)
  }

  const updateData: Record<string, unknown> = {
    stage: parsed.data.stage,
    lostReason: parsed.data.lostReason || null,
    competitorBrand: parsed.data.competitorBrand || null,
    updatedAt: new Date().toISOString(),
  }
  if (parsed.data.stage === 'won') {
    updateData.wonAmount = existing.expectedAmount
  }

  await db.update(deals).set(updateData).where(eq(deals.id, id))

  const updated = await db.select().from(deals).where(eq(deals.id, id)).get()
  return c.json({ success: true, data: updated })
})
