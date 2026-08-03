import { Hono } from 'hono'
import { eq, and } from 'drizzle-orm'
import { createDb } from '../db'
import { visitPlans, visitLogs, customers } from '../db/schema'
import { authMiddleware } from '../middleware/auth'
import { requireManager } from '../middleware/role-guard'
import {
  createVisitPlanSchema,
  createVisitLogSchema,
  updateVisitPlanSchema,
  updateVisitLogSchema,
  generateVisitPlansSchema,
} from '@sala-corporate/shared'
import type { DbClient } from '../db'

type Env = {
  DB: D1Database | DbClient
  STORAGE?: R2Bucket
  JWT_SECRET: string
}

function resolveDb(env: Env): DbClient {
  const db = env.DB
  // In tests, DB may already be a drizzle instance
  if (db && typeof db === 'object' && 'insert' in db) {
    return db as unknown as DbClient
  }
  return createDb(db as D1Database)
}

export const visitRoutes = new Hono<{
  Bindings: Env
  Variables: { user: { id: string; role: string; name: string } }
}>()

// ====================== Visit Plans ======================

// GET /visit-plans — list (by month, by rep)
visitRoutes.get('/visit-plans', authMiddleware, async (c) => {
  const db = resolveDb(c.env)
  const user = c.get('user')
  const month = c.req.query('month')

  if (month && user.role !== 'manager') {
    const plans = await db.select().from(visitPlans).where(
      and(eq(visitPlans.month, month), eq(visitPlans.salesRepId, user.id))
    ).all()
    return c.json({ success: true, data: plans })
  }

  if (month) {
    const plans = await db.select().from(visitPlans).where(
      eq(visitPlans.month, month)
    ).all()
    return c.json({ success: true, data: plans })
  }

  if (user.role !== 'manager') {
    const plans = await db.select().from(visitPlans).where(
      eq(visitPlans.salesRepId, user.id)
    ).all()
    return c.json({ success: true, data: plans })
  }

  const plans = await db.select().from(visitPlans).all()
  return c.json({ success: true, data: plans })
})

// POST /visit-plans — create
visitRoutes.post('/visit-plans', authMiddleware, async (c) => {
  const db = resolveDb(c.env)
  const body = await c.req.json()
  const parsed = createVisitPlanSchema.safeParse(body)

  if (!parsed.success) {
    return c.json({ success: false, error: parsed.error.issues[0].message }, 400)
  }

  const id = crypto.randomUUID()
  await db.insert(visitPlans).values({
    id,
    ...parsed.data,
    status: 'planned',
  })

  const plan = await db.select().from(visitPlans).where(eq(visitPlans.id, id)).get()
  return c.json({ success: true, data: plan }, 201)
})

// POST /visit-plans/generate — auto-generate monthly plans (manager only)
visitRoutes.post('/visit-plans/generate', authMiddleware, requireManager, async (c) => {
  const db = resolveDb(c.env)
  const body = await c.req.json()
  const parsed = generateVisitPlansSchema.safeParse(body)

  if (!parsed.success) {
    return c.json({ success: false, error: parsed.error.issues[0].message }, 400)
  }

  const { month } = parsed.data

  // Find active customers with assigned reps
  const rows = await db.select().from(customers).where(
    eq(customers.status, 'active')
  ).all()

  // Filter only customers with assigned reps
  const customersWithReps = rows.filter(c => c.assignedTo)

  if (customersWithReps.length === 0) {
    return c.json({ success: true, data: [], message: 'No active customers with assigned reps' }, 201)
  }

  const created: unknown[] = []
  for (const cust of customersWithReps) {
    // Check if plan already exists for this month/customer/rep
    const existing = await db.select().from(visitPlans).where(
      and(
        eq(visitPlans.month, month),
        eq(visitPlans.customerId, cust.id),
        eq(visitPlans.salesRepId, cust.assignedTo!),
      )
    ).get()

    if (!existing) {
      const id = crypto.randomUUID()
      const plannedDate = `${month}-15` // Default to 15th of month
      await db.insert(visitPlans).values({
        id,
        customerId: cust.id,
        salesRepId: cust.assignedTo!,
        month,
        plannedDate,
        visitType: 'follow_up',
        status: 'planned',
      })
      const plan = await db.select().from(visitPlans).where(eq(visitPlans.id, id)).get()
      created.push(plan)
    }
  }

  return c.json({ success: true, data: created }, 201)
})

// PATCH /visit-plans/:id — update status
visitRoutes.patch('/visit-plans/:id', authMiddleware, async (c) => {
  const db = resolveDb(c.env)
  const id = c.req.param('id')
  const body = await c.req.json()
  const parsed = updateVisitPlanSchema.safeParse(body)

  if (!parsed.success) {
    return c.json({ success: false, error: parsed.error.issues[0].message }, 400)
  }

  const existing = await db.select().from(visitPlans).where(eq(visitPlans.id, id)).get()
  if (!existing) {
    return c.json({ success: false, error: 'ไม่พบแผนการเข้าเยี่ยม' }, 404)
  }

  await db.update(visitPlans).set(parsed.data).where(eq(visitPlans.id, id))

  const updated = await db.select().from(visitPlans).where(eq(visitPlans.id, id)).get()
  return c.json({ success: true, data: updated })
})

// ====================== Visit Logs ======================

// GET /visit-logs — list
visitRoutes.get('/visit-logs', authMiddleware, async (c) => {
  const db = resolveDb(c.env)
  const user = c.get('user')

  if (user.role !== 'manager') {
    const logs = await db.select().from(visitLogs).where(
      eq(visitLogs.salesRepId, user.id)
    ).all()
    return c.json({ success: true, data: logs })
  }

  const logs = await db.select().from(visitLogs).all()
  return c.json({ success: true, data: logs })
})

// POST /visit-logs — record visit (with GPS lat/lng)
visitRoutes.post('/visit-logs', authMiddleware, async (c) => {
  const db = resolveDb(c.env)
  const user = c.get('user')
  const body = await c.req.json()
  const parsed = createVisitLogSchema.safeParse(body)

  if (!parsed.success) {
    return c.json({ success: false, error: parsed.error.issues[0].message }, 400)
  }

  const id = crypto.randomUUID()
  await db.insert(visitLogs).values({
    id,
    ...parsed.data,
    salesRepId: user.id,
    attachments: [],
  })

  const log = await db.select().from(visitLogs).where(eq(visitLogs.id, id)).get()
  return c.json({ success: true, data: log }, 201)
})

// PATCH /visit-logs/:id — update
visitRoutes.patch('/visit-logs/:id', authMiddleware, async (c) => {
  const db = resolveDb(c.env)
  const id = c.req.param('id')
  const body = await c.req.json()
  const parsed = updateVisitLogSchema.safeParse(body)

  if (!parsed.success) {
    return c.json({ success: false, error: parsed.error.issues[0].message }, 400)
  }

  const existing = await db.select().from(visitLogs).where(eq(visitLogs.id, id)).get()
  if (!existing) {
    return c.json({ success: false, error: 'ไม่พบข้อมูลการเข้าเยี่ยม' }, 404)
  }

  await db.update(visitLogs).set(parsed.data).where(eq(visitLogs.id, id))

  const updated = await db.select().from(visitLogs).where(eq(visitLogs.id, id)).get()
  return c.json({ success: true, data: updated })
})

// POST /visit-logs/upload — upload attachment to R2
visitRoutes.post('/visit-logs/upload', authMiddleware, async (c) => {
  const db = resolveDb(c.env)

  try {
    const formData = await c.req.formData()
    const file = formData.get('file') as File | null
    const visitLogId = formData.get('visitLogId') as string | null

    if (!file || !visitLogId) {
      return c.json({ success: false, error: 'Missing file or visitLogId' }, 400)
    }

    // Verify the visit log exists
    const existing = await db.select().from(visitLogs).where(eq(visitLogs.id, visitLogId)).get()
    if (!existing) {
      return c.json({ success: false, error: 'Visit log not found' }, 404)
    }

    // Upload to R2 if available
    if (c.env.STORAGE) {
      const key = `visits/${visitLogId}/${crypto.randomUUID()}-${file.name}`
      await c.env.STORAGE.put(key, file.stream(), {
        httpMetadata: { contentType: file.type },
      })

      // Update the visit log's attachments
      const currentAttachments = existing.attachments || []
      const updatedAttachments = [...currentAttachments, key]

      await db.update(visitLogs)
        .set({ attachments: updatedAttachments })
        .where(eq(visitLogs.id, visitLogId))

      return c.json({ success: true, data: { key, url: `/storage/${key}` } })
    }

    // Fallback: no R2 available (testing / local environment)
    return c.json({
      success: true,
      data: { key: `visits/${visitLogId}/mock-${file.name}`, url: '' },
    })
  } catch {
    return c.json({ success: false, error: 'Upload failed' }, 500)
  }
})
