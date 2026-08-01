import { Hono } from 'hono'
import { eq, sql } from 'drizzle-orm'
import { createDb } from '../db'
import { deals, customers, teamMembers } from '../db/schema'
import { authMiddleware } from '../middleware/auth'
import { createDealSchema, updateDealSchema, updateDealStageSchema } from '@isuzu-corporate/shared'
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

  if (user.role !== 'manager') {
    const result = (db.all as any)(sql`
      SELECT
        d.stage,
        COUNT(*) as count,
        COALESCE(
          SUM(CASE WHEN d.stage = 'won' THEN d.won_amount ELSE d.expected_amount END), 0
        ) as total_value
      FROM deals d
      WHERE d.sales_rep_id = ${user.id}
      GROUP BY d.stage
      ORDER BY
        CASE d.stage
          WHEN 'lead' THEN 1
          WHEN 'visit_done' THEN 2
          WHEN 'quote_sent' THEN 3
          WHEN 'negotiating' THEN 4
          WHEN 'won' THEN 5
          WHEN 'lost' THEN 6
        END
    `)
    return c.json({ success: true, data: result })
  }

  const result = (db.all as any)(sql`
    SELECT
      d.stage,
      COUNT(*) as count,
      COALESCE(
        SUM(CASE WHEN d.stage = 'won' THEN d.won_amount ELSE d.expected_amount END), 0
      ) as total_value
    FROM deals d
    GROUP BY d.stage
    ORDER BY
      CASE d.stage
        WHEN 'lead' THEN 1
        WHEN 'visit_done' THEN 2
        WHEN 'quote_sent' THEN 3
        WHEN 'negotiating' THEN 4
        WHEN 'won' THEN 5
        WHEN 'lost' THEN 6
      END
  `)

  return c.json({ success: true, data: result })
})

// GET / — list deals with customer names
dealsRoutes.get('/', authMiddleware, async (c) => {
  const db = resolveDb(c.env)
  const user = c.get('user')

  if (user.role !== 'manager') {
    const result = (db.all as any)(sql`
      SELECT
        d.*,
        c.name as customer_name,
        tm.name as sales_rep_name
      FROM deals d
      JOIN customers c ON c.id = d.customer_id
      JOIN team_members tm ON tm.id = d.sales_rep_id
      WHERE d.sales_rep_id = ${user.id}
      ORDER BY d.created_at DESC
    `)
    return c.json({ success: true, data: result })
  }

  const result = (db.all as any)(sql`
    SELECT
      d.*,
      c.name as customer_name,
      tm.name as sales_rep_name
    FROM deals d
    JOIN customers c ON c.id = d.customer_id
    JOIN team_members tm ON tm.id = d.sales_rep_id
    ORDER BY d.created_at DESC
  `)

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

  const updateData: Record<string, unknown> = { stage: parsed.data.stage, updatedAt: new Date().toISOString() }
  if (parsed.data.stage === 'won') {
    updateData.wonAmount = existing.expectedAmount
  }

  await db.update(deals).set(updateData).where(eq(deals.id, id))

  const updated = await db.select().from(deals).where(eq(deals.id, id)).get()
  return c.json({ success: true, data: updated })
})
