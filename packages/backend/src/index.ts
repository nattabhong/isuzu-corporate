import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { authRoutes } from './routes/auth'
import { customersRoutes } from './routes/customers'
import { visitRoutes } from './routes/visits'
import { callRoutes } from './routes/calls'
import { teamRoutes } from './routes/team'
import { targetsRoutes } from './routes/targets'
import { dealsRoutes } from './routes/deals'
import { mcpRoutes } from './routes/mcp'
import { notificationsRoutes } from './routes/notifications'
import { aiRoutes } from './routes/ai'

type Env = {
  DB: D1Database
  JWT_SECRET: string
  LINE_CHANNEL_ID: string
  LINE_CHANNEL_SECRET: string
  LINE_CHANNEL_ACCESS_TOKEN: string
  GOOGLE_MAPS_API_KEY: string
  MCP_API_KEY: string
  INVITE_CODE: string
}

const app = new Hono<{ Bindings: Env }>()

app.use('*', cors({
  origin: (origin) => origin, // refine in production
  credentials: true,
}))

app.onError((err, c) => {
  console.error('Unhandled Server Error:', err)
  return c.json({
    success: false,
    error: err instanceof Error ? `${err.name}: ${err.message}\n${err.stack}` : String(err),
  }, 500)
})

// Health check
app.get('/api/health', (c) => c.json({ success: true, timestamp: new Date().toISOString() }))

// Auth routes
app.route('/api/auth', authRoutes)

// Team routes
app.route('/api/team', teamRoutes)

// Targets routes
app.route('/api/targets', targetsRoutes)

// Customer routes
app.route('/api/customers', customersRoutes)

// Deals routes
app.route('/api/deals', dealsRoutes)

// Visit routes
app.route('/api', visitRoutes)

// Call routes
app.route('/api', callRoutes)

// MCP JSON-RPC endpoint
app.route('/api', mcpRoutes)

// Notifications
app.route('/api/notifications', notificationsRoutes)

// AI Co-Pilot routes
app.route('/api/ai', aiRoutes)

export default app
