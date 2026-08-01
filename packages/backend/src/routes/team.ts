import { Hono } from 'hono'
import { eq } from 'drizzle-orm'
import { createDb } from '../db'
import { teamMembers } from '../db/schema'
import { authMiddleware } from '../middleware/auth'
import { requireManager } from '../middleware/role-guard'
import { createTeamMemberSchema } from '@isuzu-corporate/shared'
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

  const id = crypto.randomUUID()
  await db.insert(teamMembers).values({
    id,
    lineUserId: `pending_${id}`, // Will be updated on first LINE login
    ...parsed.data,
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

// DELETE /:id — deactivate member (manager only, soft delete)
teamRoutes.delete('/:id', authMiddleware, requireManager, async (c) => {
  const db = resolveDb(c.env)
  await db.update(teamMembers)
    .set({ isActive: false, updatedAt: new Date().toISOString() })
    .where(eq(teamMembers.id, c.req.param('id')))

  return c.json({ success: true })
})
