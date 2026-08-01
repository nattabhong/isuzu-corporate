import { Hono } from 'hono'
import { eq, and, count, sum, sql } from 'drizzle-orm'
import { createDb } from '../db'
import {
  visitPlans,
  callPlans,
  callLogs,
  deals,
  customers,
  teamMembers,
} from '../db/schema'
import { authMiddleware } from '../middleware/auth'
import { requireManager } from '../middleware/role-guard'
import type { DbClient } from '../db'
import type { AuthUser } from '../middleware/auth'

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

export const reportsRoutes = new Hono<{
  Bindings: Env
  Variables: { user: AuthUser }
}>()

// All routes are manager-only
reportsRoutes.use('*', authMiddleware, requireManager)

// ================================================================
// GET /visit-completion — planned vs completed vs missed by rep, by month
// ================================================================
reportsRoutes.get('/visit-completion', async (c) => {
  const db = resolveDb(c.env)
  const month = c.req.query('month')

  if (!month) {
    return c.json({ success: false, error: 'ต้องระบุเดือน (YYYY-MM)' }, 400)
  }

  const plans = await db.select().from(visitPlans).where(eq(visitPlans.month, month)).all()

  // Group by rep
  const repMap = new Map<string, { planned: number; completed: number; missed: number }>()
  const repIds = new Set<string>()

  for (const p of plans) {
    repIds.add(p.salesRepId)
    if (!repMap.has(p.salesRepId)) {
      repMap.set(p.salesRepId, { planned: 0, completed: 0, missed: 0 })
    }
    const entry = repMap.get(p.salesRepId)!
    entry.planned++
    if (p.status === 'completed') entry.completed++
    if (p.status === 'missed') entry.missed++
  }

  // Get rep names
  const reps = await db.select({ id: teamMembers.id, name: teamMembers.name })
    .from(teamMembers)
    .all()
  const repNameMap = new Map(reps.map(r => [r.id, r.name]))

  const data = Array.from(repMap.entries()).map(([repId, stats]) => ({
    salesRepId: repId,
    salesRepName: repNameMap.get(repId) ?? repId,
    ...stats,
  }))

  return c.json({ success: true, data })
})

// ================================================================
// GET /call-completion — planned vs completed vs missed by rep, by month
// ================================================================
reportsRoutes.get('/call-completion', async (c) => {
  const db = resolveDb(c.env)
  const month = c.req.query('month')

  if (!month) {
    return c.json({ success: false, error: 'ต้องระบุเดือน (YYYY-MM)' }, 400)
  }

  const plans = await db.select().from(callPlans).where(eq(callPlans.month, month)).all()

  const repMap = new Map<string, { planned: number; completed: number; missed: number }>()

  for (const p of plans) {
    if (!repMap.has(p.salesRepId)) {
      repMap.set(p.salesRepId, { planned: 0, completed: 0, missed: 0 })
    }
    const entry = repMap.get(p.salesRepId)!
    entry.planned++
    if (p.status === 'completed') entry.completed++
    if (p.status === 'missed') entry.missed++
  }

  // Get rep names
  const reps = await db.select({ id: teamMembers.id, name: teamMembers.name })
    .from(teamMembers)
    .all()
  const repNameMap = new Map(reps.map(r => [r.id, r.name]))

  const data = Array.from(repMap.entries()).map(([repId, stats]) => ({
    salesRepId: repId,
    salesRepName: repNameMap.get(repId) ?? repId,
    ...stats,
  }))

  return c.json({ success: true, data })
})

// ================================================================
// GET /lead-heatmap — Hot/Warm/Future/Maintain/Inactive counts
// ================================================================
reportsRoutes.get('/lead-heatmap', async (c) => {
  const db = resolveDb(c.env)

  const logs = await db.select({ leadLevel: callLogs.leadLevel })
    .from(callLogs)
    .all()

  const counts = { hot: 0, warm: 0, future: 0, maintain: 0, inactive: 0 }

  for (const log of logs) {
    if (log.leadLevel && log.leadLevel in counts) {
      counts[log.leadLevel as keyof typeof counts]++
    }
  }

  return c.json({ success: true, data: counts })
})

// ================================================================
// GET /sales-performance — deals won count, total value, win rate by rep
// ================================================================
reportsRoutes.get('/sales-performance', async (c) => {
  const db = resolveDb(c.env)

  const allDeals = await db.select().from(deals).all()

  // Group by rep
  const repMap = new Map<string, { totalDeals: number; dealsWon: number; totalValue: number }>()

  for (const d of allDeals) {
    if (!repMap.has(d.salesRepId)) {
      repMap.set(d.salesRepId, { totalDeals: 0, dealsWon: 0, totalValue: 0 })
    }
    const entry = repMap.get(d.salesRepId)!
    entry.totalDeals++
    if (d.stage === 'won') {
      entry.dealsWon++
      entry.totalValue += d.wonAmount ?? 0
    }
  }

  // Get rep names
  const reps = await db.select({ id: teamMembers.id, name: teamMembers.name })
    .from(teamMembers)
    .all()
  const repNameMap = new Map(reps.map(r => [r.id, r.name]))

  const data = Array.from(repMap.entries()).map(([repId, stats]) => ({
    salesRepId: repId,
    salesRepName: repNameMap.get(repId) ?? repId,
    ...stats,
    winRate: stats.totalDeals > 0 ? Math.round((stats.dealsWon / stats.totalDeals) * 100 * 100) / 100 : 0,
  }))

  return c.json({ success: true, data })
})

// ================================================================
// GET /coverage-gaps — customers with no visit/call in current month
// ================================================================
reportsRoutes.get('/coverage-gaps', async (c) => {
  const db = resolveDb(c.env)
  const month = c.req.query('month')

  if (!month) {
    return c.json({ success: false, error: 'ต้องระบุเดือน (YYYY-MM)' }, 400)
  }

  // Get all active customers
  const activeCustomers = await db.select().from(customers)
    .where(eq(customers.status, 'active'))
    .all()

  if (activeCustomers.length === 0) {
    return c.json({ success: true, data: [] })
  }

  // Get customers with completed visits this month
  const visitedPlans = await db.select({ customerId: visitPlans.customerId })
    .from(visitPlans)
    .where(
      and(
        eq(visitPlans.month, month),
        eq(visitPlans.status, 'completed'),
      )
    )
    .all()
  const visitedIds = new Set(visitedPlans.map(v => v.customerId))

  // Get customers with completed calls this month
  const calledPlans = await db.select({ customerId: callPlans.customerId })
    .from(callPlans)
    .where(
      and(
        eq(callPlans.month, month),
        eq(callPlans.status, 'completed'),
      )
    )
    .all()
  const calledIds = new Set(calledPlans.map(c => c.customerId))

  // Get rep names
  const reps = await db.select({ id: teamMembers.id, name: teamMembers.name })
    .from(teamMembers)
    .all()
  const repNameMap = new Map(reps.map(r => [r.id, r.name]))

  // Compute days overdue based on month
  const [yearStr, monthStr] = month.split('-')
  const now = new Date()
  const currentDay = now.getDate()

  const gaps = activeCustomers
    .filter(c => !visitedIds.has(c.id) && !calledIds.has(c.id))
    .map(c => {
      // Days overdue: days since the start of the given month
      const targetYear = parseInt(yearStr)
      const targetMonth = parseInt(monthStr)
      const targetDate = new Date(targetYear, targetMonth - 1, 1)
      const daysDiff = Math.floor((now.getTime() - targetDate.getTime()) / (1000 * 60 * 60 * 24))
      const daysOverdue = Math.max(1, daysDiff)

      return {
        customerId: c.id,
        customerName: c.name,
        segment: c.segment,
        salesRepId: c.assignedTo,
        salesRepName: repNameMap.get(c.assignedTo ?? '') ?? '—',
        daysOverdue,
      }
    })

  return c.json({ success: true, data: gaps })
})

// ================================================================
// GET /team-leaderboard — rep ranking by visit+call+deal score
// ================================================================
reportsRoutes.get('/team-leaderboard', async (c) => {
  const db = resolveDb(c.env)
  const month = c.req.query('month')

  if (!month) {
    return c.json({ success: false, error: 'ต้องระบุเดือน (YYYY-MM)' }, 400)
  }

  // Get active sales reps
  const reps = await db.select()
    .from(teamMembers)
    .where(
      and(
        eq(teamMembers.role, 'sales_rep'),
        eq(teamMembers.isActive, true),
      )
    )
    .all()

  // Get completed visits for month
  const completedVisits = await db.select({ salesRepId: visitPlans.salesRepId })
    .from(visitPlans)
    .where(
      and(
        eq(visitPlans.month, month),
        eq(visitPlans.status, 'completed'),
      )
    )
    .all()

  // Get completed calls for month
  const completedCalls = await db.select({ salesRepId: callPlans.salesRepId })
    .from(callPlans)
    .where(
      and(
        eq(callPlans.month, month),
        eq(callPlans.status, 'completed'),
      )
    )
    .all()

  // Get won deals (all time — for leaderboard purposes)
  const wonDeals = await db.select({ salesRepId: deals.salesRepId })
    .from(deals)
    .where(eq(deals.stage, 'won'))
    .all()

  // Count by rep
  const visitCounts = new Map<string, number>()
  for (const v of completedVisits) {
    visitCounts.set(v.salesRepId, (visitCounts.get(v.salesRepId) ?? 0) + 1)
  }

  const callCounts = new Map<string, number>()
  for (const c of completedCalls) {
    callCounts.set(c.salesRepId, (callCounts.get(c.salesRepId) ?? 0) + 1)
  }

  const dealCounts = new Map<string, number>()
  for (const d of wonDeals) {
    dealCounts.set(d.salesRepId, (dealCounts.get(d.salesRepId) ?? 0) + 1)
  }

  // Build leaderboard
  const leaderboard = reps.map(rep => {
    const visitCompleted = visitCounts.get(rep.id) ?? 0
    const callCompleted = callCounts.get(rep.id) ?? 0
    const dealsWon = dealCounts.get(rep.id) ?? 0
    const score = visitCompleted * 1 + callCompleted * 1 + dealsWon * 10

    return {
      salesRepId: rep.id,
      salesRepName: rep.name,
      territory: rep.territory,
      visitCompleted,
      callCompleted,
      dealsWon,
      score,
    }
  })

  // Sort by score descending
  leaderboard.sort((a, b) => b.score - a.score)

  return c.json({ success: true, data: leaderboard })
})
