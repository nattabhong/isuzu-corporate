import { Hono } from 'hono'
import { eq, and } from 'drizzle-orm'
import { createDb } from '../db'
import { monthlyTargets } from '../db/schema'
import { authMiddleware } from '../middleware/auth'
import { requireManager } from '../middleware/role-guard'
import { upsertMonthlyTargetSchema } from '@sala-corporate/shared'
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

export const targetsRoutes = new Hono<{
  Bindings: Env
  Variables: { user: { id: string; role: string; name: string } }
}>()

// GET /summary — list targets for a month
targetsRoutes.get('/summary', authMiddleware, async (c) => {
  const db = resolveDb(c.env)
  const user = c.get('user')
  const month = c.req.query('month')

  if (!month) {
    return c.json({ success: false, error: 'month query parameter is required' }, 400)
  }

  if (user.role !== 'manager') {
    const userTargets = await db.select().from(monthlyTargets).where(
      and(eq(monthlyTargets.salesRepId, user.id), eq(monthlyTargets.month, month))
    ).all()
    return c.json({ success: true, data: userTargets })
  }

  const allTargets = await db.select().from(monthlyTargets).where(
    eq(monthlyTargets.month, month)
  ).all()
  return c.json({ success: true, data: allTargets })
})

// POST / — upsert target (manager only)
targetsRoutes.post('/', authMiddleware, requireManager, async (c) => {
  const db = resolveDb(c.env)
  const body = await c.req.json()
  const parsed = upsertMonthlyTargetSchema.safeParse(body)

  if (!parsed.success) {
    return c.json({ success: false, error: parsed.error.issues[0].message }, 400)
  }

  const { salesRepId, month, visitTarget, callTarget, dealTarget } = parsed.data

  // Upsert: try to find existing
  const existing = await db.select().from(monthlyTargets).where(
    and(eq(monthlyTargets.salesRepId, salesRepId), eq(monthlyTargets.month, month))
  ).get()

  if (existing) {
    await db.update(monthlyTargets)
      .set({ visitTarget, callTarget, dealTarget: dealTarget ?? null })
      .where(eq(monthlyTargets.id, existing.id))

    const updated = await db.select().from(monthlyTargets).where(eq(monthlyTargets.id, existing.id)).get()
    return c.json({ success: true, data: updated })
  }

  const id = crypto.randomUUID()
  await db.insert(monthlyTargets).values({
    id,
    salesRepId,
    month,
    visitTarget,
    callTarget,
    dealTarget: dealTarget ?? null,
  })

  const created = await db.select().from(monthlyTargets).where(eq(monthlyTargets.id, id)).get()
  return c.json({ success: true, data: created }, 201)
})
