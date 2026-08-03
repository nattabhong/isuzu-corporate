import { Hono } from 'hono'
import { eq } from 'drizzle-orm'
import { createDb } from '../db'
import { teamMembers } from '../db/schema'
import { authMiddleware } from '../middleware/auth'
import { requireManager } from '../middleware/role-guard'
import { createTeamMemberSchema } from '@sala-corporate/shared'
import type { DbClient } from '../db'

type Env = {
  DB: D1Database | DbClient
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

export const teamRoutes = new Hono<{ Bindings: Env }>()

// GET / — list members (manager sees all, rep sees self)
teamRoutes.get('/', authMiddleware, async (c) => {
  const db = resolveDb(c.env)
  const user = c.var.user

  if (user.role === 'manager') {
    const members = await db.select().from(teamMembers).all()
    return c.json({ success: true, data: members })
  }

  const member = await db.query.teamMembers.findFirst({
    where: eq(teamMembers.id, user.id),
  })
  return c.json({ success: true, data: member ? [member] : [] })
})

// GET /:id — get single member
teamRoutes.get('/:id', authMiddleware, async (c) => {
  const db = resolveDb(c.env)
  const member = await db.query.teamMembers.findFirst({
    where: eq(teamMembers.id, c.req.param('id')),
  })
  if (!member) {
    return c.json({ success: false, error: 'ไม่พบสมาชิก' }, 404)
  }
  return c.json({ success: true, data: member })
})

// POST / — add member (manager only)
teamRoutes.post('/', authMiddleware, requireManager, async (c) => {
  const db = resolveDb(c.env)
  const body = await c.req.json()
  const parsed = createTeamMemberSchema.safeParse(body)

  if (!parsed.success) {
    return c.json({ success: false, error: parsed.error.issues[0].message }, 400)
  }

  const { password, ...memberData } = parsed.data

  if (memberData.email) {
    const normalizedEmail = memberData.email.toLowerCase()
    const existing = await db.select().from(teamMembers)
      .where(eq(teamMembers.email, normalizedEmail))
      .limit(1)
      .all()

    if (existing.length > 0) {
      return c.json({ success: false, error: 'อีเมลนี้ถูกใช้งานแล้ว' }, 409)
    }
    memberData.email = normalizedEmail
  }

  let passwordHash: string | undefined
  if (password && password.length >= 6) {
    const { hashPassword } = await import('../services/password')
    passwordHash = await hashPassword(password)
  }

  const id = crypto.randomUUID()
  await db.insert(teamMembers).values({
    id,
    lineUserId: `pending_${id}`, // Will be updated on first LINE login
    ...memberData,
    ...(passwordHash ? { passwordHash } : {}),
  })

  const member = await db.query.teamMembers.findFirst({
    where: eq(teamMembers.id, id),
  })
  return c.json({ success: true, data: member }, 201)
})

// PATCH /:id — update member (manager only)
teamRoutes.patch('/:id', authMiddleware, requireManager, async (c) => {
  const db = resolveDb(c.env)
  const body = await c.req.json()

  await db.update(teamMembers)
    .set({ ...body, updatedAt: new Date().toISOString() })
    .where(eq(teamMembers.id, c.req.param('id')))

  const member = await db.query.teamMembers.findFirst({
    where: eq(teamMembers.id, c.req.param('id')),
  })
  return c.json({ success: true, data: member ?? null })
})

// POST /:id/reset-password — manager reset staff password
teamRoutes.post('/:id/reset-password', authMiddleware, requireManager, async (c) => {
  const db = resolveDb(c.env)
  const body = await c.req.json() as { newPassword?: string }
  const { newPassword } = body

  if (!newPassword || newPassword.length < 6) {
    return c.json({ success: false, error: 'รหัสผ่านใหม่ต้องมีความยาวอย่างน้อย 6 ตัวอักษร' }, 400)
  }

  const { hashPassword } = await import('../services/password')
  const passwordHash = await hashPassword(newPassword)

  await db.update(teamMembers)
    .set({ passwordHash, updatedAt: new Date().toISOString() })
    .where(eq(teamMembers.id, c.req.param('id')))

  return c.json({ success: true, message: 'รีเซ็ตรหัสผ่านสำเร็จ' })
})

// POST /reassign — manager reassign customers and deals from oldRep to newRep
teamRoutes.post('/reassign', authMiddleware, requireManager, async (c) => {
  const db = resolveDb(c.env)
  const body = await c.req.json() as { fromSalesRepId?: string; toSalesRepId?: string }
  const { fromSalesRepId, toSalesRepId } = body

  if (!fromSalesRepId || !toSalesRepId) {
    return c.json({ success: false, error: 'กรุณาระบุพนักงานต้นทางและปลายทาง' }, 400)
  }

  const { customers, deals } = await import('../db/schema')

  await db.update(customers)
    .set({ assignedTo: toSalesRepId, updatedAt: new Date().toISOString() })
    .where(eq(customers.assignedTo, fromSalesRepId))

  await db.update(deals)
    .set({ salesRepId: toSalesRepId, updatedAt: new Date().toISOString() })
    .where(eq(deals.salesRepId, fromSalesRepId))

  return c.json({ success: true, message: 'โอนย้ายพอร์ตลูกค้าและดีลสำเร็จ' })
})

// DELETE /:id — deactivate member (manager only, soft delete)
teamRoutes.delete('/:id', authMiddleware, requireManager, async (c) => {
  const db = resolveDb(c.env)
  await db.update(teamMembers)
    .set({ isActive: false, updatedAt: new Date().toISOString() })
    .where(eq(teamMembers.id, c.req.param('id')))

  return c.json({ success: true })
})
