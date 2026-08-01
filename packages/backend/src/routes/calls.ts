import { Hono } from 'hono'
import { eq, and } from 'drizzle-orm'
import { createDb } from '../db'
import { callLogs, callPlans, customers } from '../db/schema'
import { authMiddleware } from '../middleware/auth'
import { requireManager } from '../middleware/role-guard'
import {
  createCallLogSchema,
  createCallPlanSchema,
  updateCallPlanSchema,
  generateCallPlansSchema,
  updateCallLogSchema,
} from '@isuzu-corporate/shared'
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

export const callRoutes = new Hono<{
  Bindings: Env
  Variables: { user: { id: string; role: string; name: string } }
}>()

// ── Helper: serialize JSON arrays to strings for drizzle (needed for sqlite mode:json) ──
function serializeArrays(data: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(data)) {
    out[k] = Array.isArray(v) ? JSON.stringify(v) : v
  }
  return out
}

// ── Helper: parse JSON string fields from DB rows ──
function parseJsonFields(row: Record<string, unknown>): Record<string, unknown> {
  const jsonFields = [
    'usageTypes', 'mainProblems', 'interestedModels', 'purchasePurpose',
    'decisionMakers', 'keyFactors', 'interestedServices', 'businessOpportunities',
    'nextActions', 'attachments',
  ]
  const out: Record<string, unknown> = { ...row }
  for (const field of jsonFields) {
    const val = out[field]
    if (typeof val === 'string') {
      try { out[field] = JSON.parse(val) } catch { /* keep as-is */ }
    }
  }
  return out
}

// ====================== Call Plans ======================

// GET /call-plans — list (by month / rep)
callRoutes.get('/call-plans', authMiddleware, async (c) => {
  const db = resolveDb(c.env)
  const user = c.get('user')
  const month = c.req.query('month')

  let plans: any[]
  if (month && user.role !== 'manager') {
    plans = await db.select().from(callPlans).where(eq(callPlans.month, month)).all()
    plans = plans.filter((p) => p.salesRepId === user.id)
  } else if (month) {
    plans = await db.select().from(callPlans).where(eq(callPlans.month, month)).all()
  } else if (user.role !== 'manager') {
    plans = await db.select().from(callPlans).where(eq(callPlans.salesRepId, user.id)).all()
  } else {
    plans = await db.select().from(callPlans).all()
  }

  return c.json({ success: true, data: plans })
})

// POST /call-plans — create
callRoutes.post('/call-plans', authMiddleware, async (c) => {
  const db = resolveDb(c.env)
  const body = await c.req.json()
  const parsed = createCallPlanSchema.safeParse(body)

  if (!parsed.success) {
    return c.json({ success: false, error: parsed.error.issues[0].message }, 400)
  }

  const id = crypto.randomUUID()
  await db.insert(callPlans).values({
    id,
    ...parsed.data,
    status: 'planned',
  })

  const plan = await db.select().from(callPlans).where(eq(callPlans.id, id)).get()
  return c.json({ success: true, data: plan }, 201)
})

// POST /call-plans/generate — auto-generate monthly call plans (manager only)
callRoutes.post('/call-plans/generate', authMiddleware, requireManager, async (c) => {
  const db = resolveDb(c.env)
  const body = await c.req.json()
  const parsed = generateCallPlansSchema.safeParse(body)

  if (!parsed.success) {
    return c.json({ success: false, error: parsed.error.issues[0].message }, 400)
  }

  const { month } = parsed.data

  const allCustomers = await db.select().from(customers).where(
    and(eq(customers.status, 'active'))
  ).all()

  const activeWithReps = allCustomers.filter((c) => c.assignedTo)
  if (activeWithReps.length === 0) {
    return c.json({ success: true, data: [] }, 201)
  }

  const created: unknown[] = []
  for (const cust of activeWithReps) {
    // Segment A, B: 2 calls/mo; Segment C: 1 call/mo
    const targetCount = cust.segment === 'C' ? 1 : 2

    // How many plans already exist for this month/customer/rep?
    const existing = await db.select().from(callPlans).where(
      and(
        eq(callPlans.month, month),
        eq(callPlans.customerId, cust.id),
        eq(callPlans.salesRepId, cust.assignedTo!),
      )
    ).all()

    const toCreate = targetCount - existing.length
    for (let i = 0; i < toCreate; i++) {
      const id = crypto.randomUUID()
      const day = 5 + i * 15 // spread across the month
      const plannedDate = `${month}-${String(day).padStart(2, '0')}`
      await db.insert(callPlans).values({
        id,
        customerId: cust.id,
        salesRepId: cust.assignedTo!,
        month,
        plannedDate,
        callPurpose: 'check_in',
        status: 'planned',
      })
      const plan = await db.select().from(callPlans).where(eq(callPlans.id, id)).get()
      created.push(plan)
    }
  }

  return c.json({ success: true, data: created }, 201)
})

// PATCH /call-plans/:id — update
callRoutes.patch('/call-plans/:id', authMiddleware, async (c) => {
  const db = resolveDb(c.env)
  const id = c.req.param('id')
  const body = await c.req.json()
  const parsed = updateCallPlanSchema.safeParse(body)

  if (!parsed.success) {
    return c.json({ success: false, error: parsed.error.issues[0].message }, 400)
  }

  const existing = await db.select().from(callPlans).where(eq(callPlans.id, id)).get()
  if (!existing) {
    return c.json({ success: false, error: 'ไม่พบแผนการโทร' }, 404)
  }

  await db.update(callPlans).set(parsed.data).where(eq(callPlans.id, id))

  const updated = await db.select().from(callPlans).where(eq(callPlans.id, id)).get()
  return c.json({ success: true, data: updated })
})

// ====================== Call Logs ======================

// GET /call-logs — list
callRoutes.get('/call-logs', authMiddleware, async (c) => {
  const db = resolveDb(c.env)
  const user = c.get('user')

  let logs: any[]
  if (user.role !== 'manager') {
    logs = await db.select().from(callLogs).where(eq(callLogs.salesRepId, user.id)).all()
  } else {
    logs = await db.select().from(callLogs).all()
  }

  const parsed = logs.map(parseJsonFields)
  return c.json({ success: true, data: parsed })
})

// GET /call-logs/:id — single detail
callRoutes.get('/call-logs/:id', authMiddleware, async (c) => {
  const db = resolveDb(c.env)
  const id = c.req.param('id')

  const log = await db.select().from(callLogs).where(eq(callLogs.id, id)).get()
  if (!log) {
    return c.json({ success: false, error: 'ไม่พบข้อมูลการโทร' }, 404)
  }

  return c.json({ success: true, data: parseJsonFields(log as any) })
})

// GET /call-logs/:id/script — generate opening/closing script
callRoutes.get('/call-logs/:id/script', authMiddleware, async (c) => {
  const db = resolveDb(c.env)
  const id = c.req.param('id')

  const log = await db.select().from(callLogs).where(eq(callLogs.id, id)).get()
  if (!log) {
    return c.json({ success: false, error: 'ไม่พบข้อมูลการโทร' }, 404)
  }

  const parsed = parseJsonFields(log as any) as any
  const contactName = parsed.contactName || 'คุณลูกค้า'
  const position = parsed.contactPosition ? ` (${parsed.contactPosition})` : ''
  const needs = parsed.customerNeeds || ''
  const nextActions: string[] = Array.isArray(parsed.nextActions) ? parsed.nextActions : []
  const nextActionDate = parsed.nextActionDate || ''
  const nextActionDetails = parsed.nextActionDetails || ''
  const leadLevel = parsed.leadLevel || ''
  const leadLevelLabels: Record<string, string> = {
    hot: 'Hot — มีแผนซื้อภายใน 3 เดือน',
    warm: 'Warm — มีโอกาสภายใน 4–12 เดือน',
    future: 'Future — มีโอกาสใน 1–2 ปี',
    maintain: 'Maintain — ควรรักษาความสัมพันธ์',
    inactive: 'Inactive — ติดต่อไม่ได้',
  }

  // Build opening script
  let opening = `สวัสดีครับ/ค่ะ คุณ${contactName}${position}\n\n`
  opening += `ผม/ดิฉัน จากอีซูซุ เชียงใหม่\n\n`
  opening += `ขออนุญาตสอบถามข้อมูลและอัปเดตสถานะการใช้งานรถยนต์อีซูซุของทางบริษัทนะครับ/ค่ะ`

  if (needs) {
    opening += `\n\nจากข้อมูลล่าสุด ทราบว่าทางบริษัท${needs}`
  }

  if (leadLevel && leadLevelLabels[leadLevel]) {
    opening += `\n\nสถานะ Lead ปัจจุบัน: ${leadLevelLabels[leadLevel]}`
  }

  // Build closing script
  let closing = 'ขอขอบคุณสำหรับเวลาของท่านในวันนี้ครับ/ค่ะ\n\n'
  closing += 'สรุปสิ่งที่ได้จากการพูดคุยในวันนี้:\n'

  if (needs) {
    closing += `- ความต้องการ: ${needs}\n`
  }

  if (nextActions.length > 0) {
    closing += '\nขั้นตอนต่อไป:\n'
    nextActions.forEach((action: string) => {
      closing += `- ${action}\n`
    })
  }

  if (nextActionDate) {
    closing += `\nกำหนดการถัดไป: ${nextActionDate}\n`
  }

  if (nextActionDetails) {
    closing += `รายละเอียด: ${nextActionDetails}\n`
  }

  closing += '\nหากมีข้อสงสัยหรือต้องการข้อมูลเพิ่มเติม สามารถติดต่อผม/ดิฉัน ได้ตลอดเวลาครับ/ค่ะ'

  return c.json({ success: true, data: { opening, closing } })
})

// POST /call-logs — record call
callRoutes.post('/call-logs', authMiddleware, async (c) => {
  const db = resolveDb(c.env)
  const user = c.get('user')
  const body = await c.req.json()
  const parsed = createCallLogSchema.safeParse(body)

  if (!parsed.success) {
    return c.json({ success: false, error: parsed.error.issues[0].message }, 400)
  }

  const id = crypto.randomUUID()
  const data = serializeArrays(parsed.data as unknown as Record<string, unknown>)

  await db.insert(callLogs).values({
    id,
    ...data,
    salesRepId: user.id,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  } as any)

  // Auto-complete linked call plan
  if (parsed.data.callPlanId) {
    await db.update(callPlans)
      .set({ status: 'completed' })
      .where(eq(callPlans.id, parsed.data.callPlanId))
  }

  const log = await db.select().from(callLogs).where(eq(callLogs.id, id)).get()
  return c.json({ success: true, data: parseJsonFields(log as any) }, 201)
})

// PATCH /call-logs/:id — update
callRoutes.patch('/call-logs/:id', authMiddleware, async (c) => {
  const db = resolveDb(c.env)
  const id = c.req.param('id')
  const body = await c.req.json()
  const parsed = updateCallLogSchema.safeParse(body)

  if (!parsed.success) {
    return c.json({ success: false, error: parsed.error.issues[0].message }, 400)
  }

  const existing = await db.select().from(callLogs).where(eq(callLogs.id, id)).get()
  if (!existing) {
    return c.json({ success: false, error: 'ไม่พบข้อมูลการโทร' }, 404)
  }

  const data = serializeArrays(parsed.data as unknown as Record<string, unknown>)
  await db.update(callLogs).set({
    ...data,
    updatedAt: new Date().toISOString(),
  } as any).where(eq(callLogs.id, id))

  const updated = await db.select().from(callLogs).where(eq(callLogs.id, id)).get()
  return c.json({ success: true, data: parseJsonFields(updated as any) })
})
