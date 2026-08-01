import { Hono } from 'hono'
import { authMiddleware } from '../middleware/auth'
import { requireManager } from '../middleware/role-guard'
import {
  runOverdueChecks,
  sendDailySummary,
} from '../services/notifications'

type Env = {
  DB: D1Database | any
  LINE_CHANNEL_ACCESS_TOKEN: string
  JWT_SECRET: string
}

export const notificationsRoutes = new Hono<{
  Bindings: Env
  Variables: { user: { id: string; role: string; name: string } }
}>()

// GET /api/notifications/check — trigger overdue checks (manager only)
notificationsRoutes.get('/check', authMiddleware, requireManager, async (c) => {
  const accessToken = c.env.LINE_CHANNEL_ACCESS_TOKEN
  if (!accessToken) {
    return c.json({
      success: false,
      error: 'LINE_CHANNEL_ACCESS_TOKEN not configured',
    }, 500)
  }

  const [result, dailyResult] = await Promise.all([
    runOverdueChecks(c.env as any),
    sendDailySummary(c.env as any),
  ])

  return c.json({
    success: true,
    data: {
      overdueVisits: result.visitResult,
      overdueCalls: result.callResult,
      dailySummary: dailyResult,
    },
  })
})
